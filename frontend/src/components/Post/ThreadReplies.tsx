import React, {
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useState,
    forwardRef,
} from "react";
import axios from "axios";
import CommentCard, { Comment } from "./CommentCard";

export interface ThreadRepliesHandle {
    addOptimisticReply: (reply: Comment) => void;
    replaceOptimisticReply: (
        tempId: string,
        reply: Comment
    ) => void;
    removeOptimisticReply: (tempId: string) => void;
}

interface ThreadRepliesProps {
    comment: Comment;
    BACKEND_URL: string;
    postOwnerId: string;
    onDelete: (commentId: string) => void;
    onReply: (comment: Comment) => void;

    registerRepliesRef?: (
        commentId: string,
        ref: ThreadRepliesHandle | null
    ) => void;
}

const ThreadReplies = forwardRef<
    ThreadRepliesHandle,
    ThreadRepliesProps
>(
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

        const [replyCount, setReplyCount] =
            useState(comment.replyCount ?? 0);

        const [replies, setReplies] = useState<Comment[]>([]);

        const [nextCursor, setNextCursor] =
            useState<string | null>(null);

        useEffect(() => {
            setReplyCount(comment.replyCount ?? 0);
        }, [comment.replyCount]);

        useImperativeHandle(ref, () => ({

            addOptimisticReply(reply) {
                setExpanded(true);
                setReplyCount(prev => prev + 1);

                setReplies(prev => {
                    // Root reply
                    if (!reply.parentComment || reply.parentComment === comment._id) {
                        return [reply, ...prev];
                    }

                    const parentIndex = prev.findIndex(
                        r => r._id === reply.parentComment
                    );

                    if (parentIndex === -1) {
                        return [...prev, reply];
                    }

                    let insertIndex = parentIndex + 1;

                    while (
                        insertIndex < prev.length &&
                        (prev[insertIndex].depth ?? 0) > (prev[parentIndex].depth ?? 0)
                    ) {
                        insertIndex++;
                    }

                    const next = [...prev];

                    next.splice(insertIndex, 0, reply);

                    return next;
                });
            },

            replaceOptimisticReply(tempId, reply) {
                setReplies(prev =>
                    prev.map(r =>
                        r._id === tempId ? reply : r
                    )
                );
            },

            removeOptimisticReply(tempId) {
                setReplyCount(prev =>
                    Math.max(prev - 1, 0)
                );

                setReplies(prev =>
                    prev.filter(r => r._id !== tempId)
                );
            },
        }));

        const loadReplies = useCallback(async () => {
            if (loading) return;

            setLoading(true);

            try {
                const res = await axios.get(
                    `${BACKEND_URL}/api/comments/${comment._id}/thread`,
                    {
                        params: {
                            limit: 20,
                        },
                    }
                );

                setReplies(res.data.replies);

                setNextCursor(
                    res.data.nextCursor ?? null
                );

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

        const loadMoreReplies =
            useCallback(async () => {
                if (
                    loadingMore ||
                    !nextCursor
                )
                    return;

                setLoadingMore(true);

                try {
                    const res = await axios.get(
                        `${BACKEND_URL}/api/comments/${comment._id}/thread`,
                        {
                            params: {
                                cursor: nextCursor,
                                limit: 20,
                            },
                        }
                    );

                    setReplies(prev => [
                        ...prev,
                        ...res.data.replies,
                    ]);

                    setNextCursor(
                        res.data.nextCursor
                    );
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoadingMore(false);
                }
            }, [
                BACKEND_URL,
                comment._id,
                loadingMore,
                nextCursor,
            ]);
        console.log(
            "ThreadReplies render",
            comment._id,
            {
                expanded,
                replyCount,
                replies
            }
        );
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
                        {replies.map(reply => (
                            <CommentCard
                                key={reply._id}
                                comment={reply}
                                BACKEND_URL={BACKEND_URL}
                                postOwnerId={postOwnerId}
                                onDelete={onDelete}
                                onReply={onReply}
                                registerRepliesRef={registerRepliesRef}
                                showThreadReplies={false}
                            />
                        ))}

                        {nextCursor && (
                            <button
                                onClick={
                                    loadMoreReplies
                                }
                                disabled={
                                    loadingMore
                                }
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 pt-2"
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

ThreadReplies.displayName = "ThreadReplies";

export default memo(ThreadReplies);