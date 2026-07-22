import React, {
    useEffect,
    memo,
    useCallback,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import axios from "axios";
import CommentCard, { Comment } from "./CommentCard";

export interface RepliesHandle {
    addOptimisticReply: (reply: Comment) => void;
    replaceOptimisticReply: (
        tempId: string,
        reply: Comment
    ) => void;
    removeOptimisticReply: (tempId: string) => void;
}

interface RepliesProps {
    comment: Comment;
    BACKEND_URL: string;
    postOwnerId: string;
    onDelete: (commentId: string) => void;
    onReply: (comment: Comment) => void;

    registerRepliesRef?: (
        commentId: string,
        ref: RepliesHandle | null
    ) => void;
}

const Replies = forwardRef<RepliesHandle, RepliesProps>(
    (
        {
            comment,
            BACKEND_URL,
            postOwnerId,
            onDelete,
            onReply,
            registerRepliesRef,
        },
        ref
    ) => {
        const [expanded, setExpanded] = useState(false);
        const [loading, setLoading] = useState(false);
        const [loadingMore, setLoadingMore] =
            useState(false);

        const [replyCount, setReplyCount] = useState(
            comment.replyCount ?? 0
        );

        const [replies, setReplies] = useState<Comment[]>([]);

        const [nextCursor, setNextCursor] =
            useState<string | null>(null);

        useImperativeHandle(ref, () => ({
            addOptimisticReply(reply) {
                setExpanded(true);
                setReplyCount(prev => prev + 1);
                setReplies(prev => [reply, ...prev]);
            },

            replaceOptimisticReply(tempId, reply) {
                setReplies((prev) =>
                    prev.map((r) =>
                        r._id === tempId ? reply : r
                    )
                );
            },

            removeOptimisticReply(tempId) {
                setReplyCount(prev => Math.max(0, prev - 1));
                setReplies(prev =>
                    prev.filter(r => r._id !== tempId)
                );
            },
        }));
        console.log(
            "Replies render",
            comment._id,
            replies.map(r => r._id)
        );
        const loadReplies = useCallback(async () => {
            console.log("LOAD REPLIES", comment._id);
            if (loading) return;

            setLoading(true);

            try {
                const res = await axios.get(
                    `${BACKEND_URL}/api/comments/${comment._id}/replies`,
                    {
                        params: {
                            limit: 20,
                        },
                    }
                );

                setReplies(res.data.replies);
                setReplyCount(
                    Math.max(
                        comment.replyCount ?? 0,
                        res.data.replies.length
                    )
                );
                setNextCursor(res.data.nextCursor);
                setExpanded(true);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, [
            BACKEND_URL,
            comment._id,
            loading,
        ]);

        useEffect(() => {
            setReplyCount(prev =>
                Math.max(prev, comment.replyCount ?? 0)
            );
        }, [comment.replyCount]);

        useEffect(() => {
            console.log("Mounted", comment._id);

            return () => {
                console.log("Unmounted", comment._id);
            };
        }, []);

        useEffect(() => {
            console.log(
                "Replies state",
                comment._id,
                replies.map(r => r._id)
            );
        }, [replies]);

        const loadMoreReplies = useCallback(async () => {
            if (!nextCursor || loadingMore) return;

            setLoadingMore(true);

            try {
                const res = await axios.get(
                    `${BACKEND_URL}/api/comments/${comment._id}/replies`,
                    {
                        params: {
                            cursor: nextCursor,
                            limit: 20,
                        },
                    }
                );

                setReplies((prev) => [
                    ...prev,
                    ...res.data.replies,
                ]);

                setNextCursor(res.data.nextCursor);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingMore(false);
            }
        }, [
            BACKEND_URL,
            comment._id,
            nextCursor,
            loadingMore,
        ]);

        console.log(
            "Replies visible?",
            comment._id,
            "replyCount:",
            comment.replyCount,
            "stored replies:",
            replies.length
        );

        if (replyCount <= 0 && replies.length === 0) {
            return null;
        }

        return (
            <div className="mt-2">
                {!expanded ? (
                    <button
                        onClick={loadReplies}
                        disabled={loading}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors pt-1"
                    >
                        <span className="w-4 h-[1px] bg-gray-300 dark:bg-zinc-700" />

                        {loading
                            ? "Loading replies..."
                            : `View ${replyCount} ${replyCount === 1
                                ? "reply"
                                : "replies"
                            }`}
                    </button>
                ) : (
                    <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-zinc-800 space-y-1">
                        {replies.map((reply) => (
                            <CommentCard
                                key={reply._id}
                                comment={reply}
                                BACKEND_URL={BACKEND_URL}
                                postOwnerId={postOwnerId}
                                onDelete={onDelete}
                                onReply={onReply}
                                registerRepliesRef={registerRepliesRef}
                            />
                        ))}

                        {nextCursor && (
                            <button
                                onClick={loadMoreReplies}
                                disabled={loadingMore}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 pt-2 block"
                            >
                                {loadingMore
                                    ? "Loading..."
                                    : "Load more replies"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }
);

Replies.displayName = "Replies";

export default memo(Replies);