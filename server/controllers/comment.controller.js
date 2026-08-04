import mongoose from "mongoose";
import Comment from "../models/Comment.js";
import AllPost from "../models/Allposts.js";
import DemoConsumption from "../models/DemoConsumption.js";
import {
    onCommentAdded,
    onCommentRemoved,
} from "../services/analyticsEvents.js";
import { parseMentions } from "../utils/mentions.js";
import {
    insertFeedback,
    fireAndForget,
} from "../services/gorse.client.js";
import { sendEventToQueue } from "../utils/sendEventToQueue.js";

const MAX_COMMENT_DEPTH = 15;
// Create a new comment
export const createComment = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { postId, text, parentCommentId = null } = req.body;
        const cleanedText = text?.trim() || "";
        const userId = req.user.id;

        // ---------------------------------------------------
        // Validation
        // ---------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                message: "Invalid post ID",
            });
        }

        if (
            parentCommentId &&
            !mongoose.Types.ObjectId.isValid(parentCommentId)
        ) {
            return res.status(400).json({
                message: "Invalid parent comment ID",
            });
        }

        if (!cleanedText) {
            return res.status(400).json({
                message: "Comment cannot be empty",
            });
        }

        if (cleanedText.length > 2000) {
            return res.status(400).json({
                message: "Comment too long",
            });
        }

        const mentionData = await parseMentions(cleanedText);

        session.startTransaction();

        // ---------------------------------------------------
        // Verify post exists
        // ---------------------------------------------------

        const post = await AllPost.findById(postId)
            .select("user commentsCount")
            .session(session);

        if (!post) {
            await session.abortTransaction();

            return res.status(404).json({
                message: "Post not found",
            });
        }

        // ---------------------------------------------------
        // Default values (Top level comment)
        // ---------------------------------------------------

        let parentComment = null;
        let rootComment = null;
        let depth = 0;

        // ---------------------------------------------------
        // Reply validation
        // ---------------------------------------------------

        if (parentCommentId) {
            parentComment = await Comment.findById(parentCommentId)
                .session(session);

            if (!parentComment) {
                await session.abortTransaction();

                return res.status(404).json({
                    message: "Parent comment not found",
                });
            }

            if (parentComment.isDeleted) {
                await session.abortTransaction();

                return res.status(400).json({
                    message:
                        "Cannot reply to a deleted comment",
                });
            }

            if (
                parentComment.post.toString() !==
                postId
            ) {
                await session.abortTransaction();

                return res.status(400).json({
                    message:
                        "Parent comment does not belong to this post",
                });
            }

            if (
                parentComment.depth >=
                MAX_COMMENT_DEPTH
            ) {
                await session.abortTransaction();

                return res.status(400).json({
                    message:
                        "Maximum reply depth reached",
                });
            }

            depth = parentComment.depth + 1;

            rootComment =
                parentComment.rootComment ||
                parentComment._id;
        }

        // ---------------------------------------------------
        // Create comment / reply
        // ---------------------------------------------------

        const [comment] = await Comment.create(
            [
                {
                    post: postId,
                    user: userId,
                    text: cleanedText,
                    parentComment:
                        parentComment?._id || null,
                    rootComment,
                    depth,
                    mentions:
                        mentionData.mentions,
                    hasInteractMention:
                        mentionData.hasInteractMention,
                },
            ],
            { session }
        );

        // ---------------------------------------------------
        // Update parent reply count
        // ---------------------------------------------------

        if (parentComment) {
            let currentComment = parentComment;

            while (currentComment) {
                await Comment.findByIdAndUpdate(
                    currentComment._id,
                    {
                        $inc: {
                            replyCount: 1,
                        },
                    },
                    { session }
                );

                if (!currentComment.parentComment) {
                    break;
                }

                currentComment = await Comment.findById(
                    currentComment.parentComment
                ).session(session);
            }
        }

        // ---------------------------------------------------
        // Update post comment count
        // ---------------------------------------------------

        await AllPost.findByIdAndUpdate(
            postId,
            {
                $inc: {
                    commentsCount: 1,
                },
            },
            {
                session,
            }
        );

        await session.commitTransaction();

        // ---------------------------------------------------
        // Populate
        // ---------------------------------------------------

        const populatedComment =
            await Comment.findById(comment._id)
                .populate(
                    "user",
                    "username avatar"
                )
                .populate(
                    "mentions.user",
                    "username displayName avatar"
                )
                .lean();

        const hasPlayedDemo =
            await DemoConsumption.exists({
                user: userId,
                gamePost: postId,
                status: "consumed",
            });

        populatedComment.hasPlayedDemo =
            !!hasPlayedDemo;

        // ---------------------------------------------------
        // Analytics
        // ---------------------------------------------------

        try {
            await onCommentAdded(postId, userId);
        } catch (err) {
            console.error(
                "Comment analytics failed:",
                err
            );
        }

        // ---------------------------------------------------
        // Queue
        // ---------------------------------------------------

        sendEventToQueue({
            type: "COMMENT_CREATED",
            actorId: userId,
            commentId: comment._id,
        }).catch(console.error);

        // ---------------------------------------------------
        // Gorse
        // ---------------------------------------------------

        fireAndForget(() =>
            insertFeedback({
                feedbackType: "comment",
                userId,
                postId,
            })
        );

        const updatedPost =
            await AllPost.findById(postId)
                .select("commentsCount");

        res.status(201).json({
            comment: populatedComment,
            commentsCount:
                updatedPost.commentsCount,
        });
    } catch (error) {
        await session.abortTransaction();

        console.error(
            "Error adding comment:",
            error
        );

        res.status(500).json({
            message: "Server error",
        });
    } finally {
        session.endSession();
    }
};
// Get comments
export const getComments = async (req, res) => {
    try {
        const { postId, cursor, limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: "Invalid post ID" });
        }

        const parsedLimit = Math.min(Number(limit) || 20, 50);
        const query = {
            post: postId,
            parentComment: null,
            ...(cursor && mongoose.Types.ObjectId.isValid(cursor) && {
                _id: { $lt: cursor },
            }),
        };

        const comments = await Comment.find(query)
            .populate("user", "username avatar")
            .populate("mentions.user", "username displayName avatar")
            .populate({
                path: "review.feedback",
                select: "overall playTimeMs suggestions",
            })
            .sort({ _id: -1 })
            .limit(parsedLimit + 1)
            .lean();

        const hasMore = comments.length > parsedLimit;

        if (hasMore) {
            comments.pop();
        }

        const nextCursor = hasMore
            ? comments[comments.length - 1]._id
            : null;

        res.json({ comments, nextCursor });

    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get Thread replies 
export const getCommentThread = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { cursor, limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID",
            });
        }

        const rootComment = await Comment.findById(commentId)
            .select("_id");

        if (!rootComment) {
            return res.status(404).json({
                message: "Comment not found",
            });
        }

        const parsedLimit = Math.min(Number(limit) || 20, 50);

        const query = {
            rootComment: rootComment._id,

            ...(cursor &&
                mongoose.Types.ObjectId.isValid(cursor) && {
                _id: {
                    $lt: cursor,
                },
            }),
        };

        const rawReplies = await Comment.find(query)
            .populate("user", "username avatar")
            .populate(
                "mentions.user",
                "username displayName avatar"
            )
            .populate({
                path: "review.feedback",
                select: "overall playTimeMs suggestions",
            })
            .sort({ createdAt: 1 })
            .lean();

        const childrenMap = new Map();

        for (const reply of rawReplies) {
            const parentId = reply.parentComment.toString();

            if (!childrenMap.has(parentId)) {
                childrenMap.set(parentId, []);
            }

            childrenMap.get(parentId).push(reply);
        }

        const orderedReplies = [];

        const traverse = (parentId) => {
            const children = childrenMap.get(parentId);

            if (!children) return;

            for (const child of children) {
                orderedReplies.push(child);
                traverse(child._id.toString());
            }
        };

        traverse(rootComment._id.toString());

        const hasMore =
            orderedReplies.length > parsedLimit;

        const paginatedReplies = hasMore
            ? orderedReplies.slice(0, parsedLimit)
            : orderedReplies;

        const nextCursor = hasMore
            ? paginatedReplies[paginatedReplies.length - 1]._id
            : null;

        return res.json({
            replies: paginatedReplies,
            nextCursor,
        });

    } catch (error) {
        console.error(
            "Error fetching comment thread:",
            error
        );

        return res.status(500).json({
            message: "Server error",
        });
    }
};

// Delete a comment
export const deleteComment = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const userId = req.user.id;
        const commentId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID",
            });
        }

        session.startTransaction();

        const comment = await Comment.findById(commentId).session(session);

        if (!comment) {
            await session.abortTransaction();

            return res.status(404).json({
                message: "Comment not found",
            });
        }

        if (comment.isDeleted) {
            await session.abortTransaction();

            return res.status(400).json({
                message: "Comment already deleted",
            });
        }

        const post = await AllPost.findById(comment.post)
            .select("user commentsCount")
            .session(session);

        if (!post) {
            await session.abortTransaction();

            return res.status(404).json({
                message: "Post not found",
            });
        }

        const isCommentOwner =
            comment.user.toString() === userId;

        const isPostOwner =
            post.user.toString() === userId;

        const isAdmin =
            req.user.role === "admin";

        if (!isCommentOwner && !isPostOwner && !isAdmin) {
            await session.abortTransaction();

            return res.status(403).json({
                message: "Not authorized",
            });
        }

        comment.isDeleted = true;
        comment.text = "[deleted]";
        comment.mentions = [];
        comment.hasInteractMention = false;

        await comment.save({ session });

        await AllPost.findByIdAndUpdate(
            comment.post,
            {
                $inc: {
                    commentsCount: -1,
                },
            },
            {
                session,
            }
        );

        await session.commitTransaction();

        try {
            await onCommentRemoved(comment.post);
        } catch (err) {
            console.error(
                "Comment removal analytics failed:",
                err
            );
        }

        const updatedPost = await AllPost.findById(comment.post)
            .select("commentsCount");

        return res.json({
            message: "Comment deleted",
            commentsCount: updatedPost.commentsCount,
        });

    } catch (error) {
        await session.abortTransaction();

        console.error(
            "Error deleting comment:",
            error
        );

        return res.status(500).json({
            message: "Server error",
        });
    } finally {
        session.endSession();
    }
};