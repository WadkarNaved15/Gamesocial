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

        if (!text?.trim()) {
            return res.status(400).json({
                message: "Comment cannot be empty",
            });
        }

        if (text.length > 2000) {
            return res.status(400).json({
                message: "Comment too long",
            });
        }

        const mentionData = await parseMentions(text);

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
                    text: text.trim(),
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
            await Comment.findByIdAndUpdate(
                parentComment._id,
                {
                    $inc: {
                        replyCount: 1,
                    },
                },
                {
                    session,
                }
            );
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
            isDeleted: false,
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
            .limit(parsedLimit)
            .lean();

        const nextCursor = comments.length > 0 ? comments[comments.length - 1]._id : null;
        res.json({ comments, nextCursor });

    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Server error" });
    }
};

//Get replies
export const getReplies = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { cursor, limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({
                message: "Invalid comment ID",
            });
        }

        const parentComment = await Comment.findById(commentId)
            .select("_id post");

        if (!parentComment) {
            return res.status(404).json({
                message: "Comment not found",
            });
        }

        const parsedLimit = Math.min(
            Number(limit) || 20,
            50
        );

        const query = {
            parentComment: parentComment._id,
            isDeleted: false,

            ...(cursor &&
                mongoose.Types.ObjectId.isValid(cursor) && {
                    _id: {
                        $lt: cursor,
                    },
                }),
        };

        const replies = await Comment.find(query)
            .populate("user", "username avatar")
            .populate(
                "mentions.user",
                "username displayName avatar"
            )
            .populate({
                path: "review.feedback",
                select: "overall playTimeMs suggestions",
            })
            .sort({ _id: -1 })
            .limit(parsedLimit)
            .lean();

        const nextCursor =
            replies.length > 0
                ? replies[replies.length - 1]._id
                : null;

        return res.json({
            replies,
            nextCursor,
        });

    } catch (error) {
        console.error(
            "Error fetching replies:",
            error
        );

        return res.status(500).json({
            message: "Server error",
        });
    }
};
// Delete a comment
export const deleteComment = async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({ message: "Invalid comment ID" });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });
        const post = await AllPost.findById(comment.post).select("user");

        if (!post) {
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
            return res.status(403).json({
                message: "Not authorized",
            });
        }

        await Comment.deleteOne({ _id: comment._id });
        const updatedPost = await AllPost.findByIdAndUpdate(
            comment.post,
            { $inc: { commentsCount: -1 } },
            { new: true }
        ).select("commentsCount");

        try {
            await onCommentRemoved(comment.post);
        } catch (err) {
            console.error("Comment removal analytics failed:", err);
        }

        res.json({
            message: "Comment deleted",
            commentsCount: updatedPost.commentsCount,
        });

    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Server error" });
    }
};