import React, { useState, useEffect, useRef, memo, useCallback } from "react";
import axios from "axios";
import { useUser } from "../../context/user";
import { useNavigate } from "react-router-dom";
import { Send, Link as LinkIcon, MessageSquare, Gamepad2 } from "lucide-react";
import { useFeed } from "../../context/FeedContext";
import MentionText from "./MentionText";
import { MentionTextarea } from "../PostModal/ActivePostForm/MentionTextarea";
import CommentCard, { Comment } from "./CommentCard";
import type { ThreadRepliesHandle } from "./ThreadReplies";
import {
  MoreHorizontal,
  Trash2,
} from "lucide-react";

interface MentionUser {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
}

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
  BACKEND_URL: string;
  onCommentAdded?: () => void;
}

const urlRegex = /(https?:\/\/[^\s]+)/g;


/* ✅ ENHANCED MAIN SECTION */
const CommentSection: React.FC<CommentSectionProps> = ({ postId, BACKEND_URL, onCommentAdded, postOwnerId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [mentions, setMentions] = useState<
    {
      originalUsername: string;
      user: MentionUser;
    }[]
  >([]);
  const handleMentionsChange = useCallback((users: MentionUser[]) => {
    setMentions((prev) => {
      const next = users.map((user) => ({
        originalUsername: user.username,
        user,
      }));

      if (
        prev.length === next.length &&
        prev.every(
          (mention, index) =>
            mention.user._id === next[index].user._id &&
            mention.originalUsername === next[index].originalUsername
        )
      ) {
        return prev;
      }
      return next;
    });
  }, []);
  const { updateCommentsCount } = useFeed();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useUser();
  const observerRef = useRef<HTMLDivElement | null>(null);
  const repliesRefs = useRef<
    Record<string, ThreadRepliesHandle | null>
  >({});

  const registerRepliesRef = useCallback(
    (commentId: string, ref: ThreadRepliesHandle | null) => {
      if (ref) {
        repliesRefs.current[commentId] = ref;
      } else {
        delete repliesRefs.current[commentId];
      }
    },
    []
  );

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/comments`, {
          params: { postId, limit: 20 }
        });
        setComments(res.data.comments);
        setNextCursor(res.data.nextCursor);
      } catch (err) { console.error(err); }
    };
    fetchComments();
  }, [postId, BACKEND_URL]);

  useEffect(() => {
    setComments([]);
    setNextCursor(null);
  }, [postId]);

  const loadMoreComments = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    try {
      setLoadingMore(true);
      const res = await axios.get(`${BACKEND_URL}/api/comments`, {
        params: { postId, limit: 20, cursor: nextCursor }
      });
      setComments(prev => [...prev, ...res.data.comments]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, BACKEND_URL, postId]);

  // Inside CommentSection component:

  // 1. Wrap setReplyingTo in a custom handler to prepend @username
  const handleReplyClick = useCallback((targetComment: Comment) => {
    setReplyingTo(targetComment);

    const parentUsername = targetComment.user?.username;
    if (parentUsername) {
      // Prepopulate textarea with @parentUsername if it's not already there
      setNewComment((prev) => {
        const mentionPrefix = `@${parentUsername} `;
        return prev.startsWith(mentionPrefix) ? prev : `${mentionPrefix}${prev}`;
      });
    }
  }, []);

  // 2. Clear reply state clean-up
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    // Optional: clear out the prepopulated @username if user cancels
    setNewComment("");
  }, []);

  useEffect(() => {
    const target = observerRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreComments();
        }
      },
      {
        threshold: 1,
      }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreComments]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;

    const parent = replyingTo; // Capture target reply before clearing state

    const tempComment: Comment = {
      _id: `temp-${Date.now()}`,
      postId,
      text: newComment,
      createdAt: new Date().toISOString(),

      user: {
        _id: user?._id || "",
        username: user?.username || "You",
        avatar: user?.avatar,
      },

      mentions,

      parentComment: parent?._id ?? null,

      rootComment: parent
        ? parent.rootComment || parent._id
        : null,

      depth: parent
        ? (parent.depth ?? 0) + 1
        : 0,
    };

    if (parent) {
      // increase the parent's reply count
      setComments((prev) =>
        prev.map((c) =>
          c._id === parent._id
            ? {
              ...c,
              replyCount: (c.replyCount || 0) + 1,
            }
            : c
        )
      );
      const threadId = parent.rootComment || parent._id;

      const repliesRef = repliesRefs.current[threadId];

      if (!repliesRef) {
        console.error("❌ No replies ref found");
      } else {
        repliesRef.addOptimisticReply(tempComment);
      }
    } else {
      // optimistic root comment
      setComments((prev) => [tempComment, ...prev]);
    }

    setReplyingTo(null);
    setNewComment("");
    setMentions([]);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/comments`,
        {
          postId,
          text: tempComment.text,
          parentCommentId: parent?._id ?? null,
        },
        {
          withCredentials: true,
        }
      );
      const { comment, commentsCount } = res.data;

      if (parent) {
        const threadId = parent.rootComment || parent._id;

        repliesRefs.current[threadId]?.replaceOptimisticReply(
          tempComment._id,
          comment
        );
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c._id === tempComment._id ? comment : c
          )
        );
      }

      updateCommentsCount(postId, commentsCount);
    } catch (err) {
      // Rollback optimistic update on error
      if (parent) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === parent._id
              ? {
                ...c,
                replyCount: Math.max(
                  0,
                  (c.replyCount || 0) - 1
                ),
              }
              : c
          )
        );

        const threadId = parent.rootComment || parent._id;

        repliesRefs.current[threadId]?.removeOptimisticReply(
          tempComment._id
        );
      }
      else {
        setComments((prev) => prev.filter((c) => c._id !== tempComment._id));
      }
      console.error(err);
    }
  }, [
    newComment,
    mentions,
    postId,
    BACKEND_URL,
    user,
    replyingTo,
    updateCommentsCount,
  ]);

  const handleDeleteComment = useCallback(async (comment: Comment) => {
    // Save original state for rollback
    const deletedReply = comment;

    // Only handle replies optimistically for now
    if (comment.parentComment) {
      const threadId = comment.rootComment!;

      // Remove immediately from UI
      repliesRefs.current[threadId]?.markReplyDeletedOptimistically(comment._id);

      // Decrease the reply count shown on the root comment
      setComments(prev =>
        prev.map(c =>
          c._id === threadId
            ? {
              ...c,
              replyCount: Math.max(0, (c.replyCount ?? 0) - 1),
            }
            : c
        )
      );
    } else {
      // Root comment optimistic delete
      setComments(prev =>
        prev.map(c =>
          c._id === comment._id
            ? {
              ...c,
              isDeleted: true,
              text: "",
              mentions: [],
              review: undefined,
            }
            : c
        )
      );
    }
    const commentId = comment._id;
    try {
      const res = await axios.delete(
        `${BACKEND_URL}/api/comments/${commentId}`,
        {
          withCredentials: true,
        }
      );

      updateCommentsCount(
        postId,
        res.data.commentsCount
      );
    } catch (err) {
      if (deletedReply.parentComment) {
        const threadId = deletedReply.rootComment!;

        repliesRefs.current[threadId]?.restoreDeletedReply(deletedReply);

        setComments(prev =>
          prev.map(c =>
            c._id === threadId
              ? {
                ...c,
                replyCount: (c.replyCount ?? 0) + 1,
              }
              : c
          )
        );
      }
      else {
        setComments(prev =>
          prev.map(c =>
            c._id === deletedReply._id
              ? deletedReply
              : c
          )
        );
      }
      console.error(err);
    }
  }, [BACKEND_URL, postId, updateCommentsCount]);

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-[#191919] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
        <MessageSquare size={18} className="text-blue-500" />
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Comments</h3>
      </div>

      {/* Input Area */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
        <div className="flex flex-col gap-2">
          {replyingTo && (
            <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-zinc-800 px-3 py-2">
              <span className="text-xs text-gray-600 dark:text-gray-300">
                Replying to{" "}
                <span className="font-semibold">
                  @{replyingTo.user?.username}
                </span>
              </span>

              <button
                onClick={handleCancelReply}
                className="text-xs text-red-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Dedicated Relative Wrapper for Textarea + Send Button */}
          <div className="relative flex items-center">
            <MentionTextarea
              value={newComment}
              onMentionsChange={handleMentionsChange}
              onChange={setNewComment}
              placeholder="Share your thoughts..."
              rows={1}
              className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="absolute right-2 p-1.5 bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-zinc-800 text-white rounded-xl hover:bg-blue-700 transition-all mb-2"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable List */}
      <div className="px-4 max-h-[500px] overflow-y-auto divide-y divide-gray-50 dark:divide-zinc-900">
        {comments.length > 0 ? (
          comments.map((c) => (
            <CommentCard
              key={c._id}
              comment={c}
              postOwnerId={postOwnerId}
              BACKEND_URL={BACKEND_URL}
              onDelete={handleDeleteComment}
              onReply={handleReplyClick}
              registerRepliesRef={registerRepliesRef}
            />
          ))
        ) : (
          <div className="py-10 text-center text-gray-400 text-sm italic">
            Be the first to start the conversation!
          </div>
        )}

        {/* 👇 Infinite Scroll Trigger */}
        {nextCursor && (
          <div ref={observerRef} className="h-10 flex items-center justify-center">
            {loadingMore && (
              <div className="text-xs text-gray-400">Loading more...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;