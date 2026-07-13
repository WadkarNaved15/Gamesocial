import React, { useState, useEffect, useRef, memo } from "react";
import axios from "axios";
import { useUser } from "../../context/user";
import { useNavigate } from "react-router-dom";
import { Send, Link as LinkIcon, MessageSquare, Gamepad2 } from "lucide-react";
import { useFeed } from "../../context/FeedContext";
import MentionText from "./MentionText"; 
import { MentionTextarea } from "../PostModal/ActivePostForm/MentionTextarea";
import {
    MoreHorizontal,
    Trash2,
} from "lucide-react";

interface Comment {
  _id: string;
  postId: string;
  text: string;
  createdAt: string;
  user?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  mentions?: {
  user: {
    _id: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  originalUsername: string;
}[]
  hasPlayedDemo?: boolean;
}

interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
  BACKEND_URL: string;
  onCommentAdded?: () => void;
}

const urlRegex = /(https?:\/\/[^\s]+)/g;

/* ✅ ENHANCED COMMENT CARD */
const CommentCard = memo(({ comment, BACKEND_URL, linkPreviewCache ,onDelete ,postOwnerId}: any) => {
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const urls = comment.text?.match(urlRegex);
  const navigate = useNavigate();
  const url = urls?.[0];
  const fetchedRef = useRef(false);
  const { user } = useUser();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   if (!url || fetchedRef.current) return;
  //   if (linkPreviewCache.current[url]) {
  //     setLinkPreview(linkPreviewCache.current[url]);
  //     fetchedRef.current = true;
  //     return;
  //   }
  //   const fetchMetadata = async () => { ... }
  // }, [url, BACKEND_URL, linkPreviewCache]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (
            menuRef.current &&
            !menuRef.current.contains(e.target as Node)
        ) {
            setShowMenu(false);
        }
    };

    document.addEventListener(
        "mousedown",
        handleClickOutside
    );

    return () =>
        document.removeEventListener(
            "mousedown",
            handleClickOutside
        );
}, []);

const canDelete =
  user?._id === comment.user?._id ||
  user?._id === postOwnerId ||
  user?.role === "admin";

  return (
    <div className="flex gap-3 py-4 group">
      {/* Avatar Placeholder */}
      <div className="flex-shrink-0">
        <img
          src={comment.user?.avatar || "/default_avatar.png"}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${comment.user?.username}`);
          }}
          className="h-10 w-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
          alt="Avatar"
        />
      </div>

      <div className="flex-grow">
        <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-zinc-800">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {comment.user?.username || "Anonymous"}
              </span>

              {/* 👇 UPDATED CIRCULAR "PLAYED" BADGE */}
              {comment.hasPlayedDemo && (
                <div
                  title="Verified Player"
                  className="relative flex items-center justify-center rounded-full flex-shrink-0 shadow-sm border border-emerald-400/30"
                  style={{
                    width: "22px", // Scaled down to match text size
                    height: "22px",
                    background: "linear-gradient(135deg, #4ade80 0%, #166534 100%)", // Matching the green from your reference
                  }}
                >
                  {/* Center Gamepad Icon */}
                  <Gamepad2 size={10} className="text-white z-10" fill="currentColor" strokeWidth={2.5} />
                  
                  {/* Circular SVG Text */}
                  <svg 
                    viewBox="0 0 100 100" 
                    className="absolute inset-0 w-full h-full pointer-events-none transform -rotate-12"
                  >
                    <path 
                      id={`circlePath-${comment._id}`} 
                      d="M 50, 14 a 36,36 0 1,1 0,72 a 36,36 0 1,1 0,-72" 
                      fill="none" 
                    />
                    <text fill="rgba(255,255,255,0.9)" fontSize="16" fontWeight="900">
                      {/* textLength="226" roughly matches the path circumference to space it perfectly */}
                      <textPath href={`#circlePath-${comment._id}`} textLength="226" lengthAdjust="spacing">
                        PLAYED • PLAYED • 
                      </textPath>
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-medium">
                  {new Date(comment.createdAt).toLocaleDateString()}
              </span>

              {canDelete && (
                  <div ref={menuRef} className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(v => !v);
                        }}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-36 rounded-lg bg-white dark:bg-zinc-900 shadow-xl border border-gray-200 dark:border-zinc-700 z-50">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    onDelete(comment._id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                                <Trash2 size={15} />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
              )}
          </div>
          </div>

          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
            {comment.text.split(urlRegex).map((part: string, i: number) =>
              urlRegex.test(part) ? (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <LinkIcon size={12} />
                  {new URL(part).hostname}
                </a>
              ) : (
                <MentionText
                  key={i}
                  text={part}
                  mentions={comment.mentions}
                />
              )
            )}
          </div>
        </div>

        {/* Enhanced Link Preview */}
        {loadingPreview && (
          <div className="mt-3 h-24 w-full bg-gray-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
        )}

        {linkPreview && (
          <a
            href={linkPreview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm"
          >
            <div className="flex flex-col sm:flex-row">
              {linkPreview.image && (
                <img src={linkPreview.image} className="sm:w-32 h-32 sm:h-auto object-cover border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-zinc-800" alt="" />
              )}
              <div className="p-3 overflow-hidden">
                <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{linkPreview.title}</h4>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{linkPreview.description}</p>
                <p className="text-[10px] text-blue-500 mt-2 font-mono uppercase tracking-wider">{new URL(linkPreview.url!).hostname}</p>
              </div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
});

/* ✅ ENHANCED MAIN SECTION */
const CommentSection: React.FC<CommentSectionProps> = ({ postId, BACKEND_URL, onCommentAdded , postOwnerId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [mentions, setMentions] = useState<
    {
      originalUsername: string;
      user: {
        _id: string;
        username: string;
        displayName: string;
        avatar: string;
      };
    }[]
  >([]);
  const { updateCommentsCount } = useFeed();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user } = useUser();
  const observerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!observerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreComments();
        }
      },
      { threshold: 1 }
    );
    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [observerRef.current, nextCursor, loadingMore]);

  const loadMoreComments = async () => {
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
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

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
    };

    setComments(prev => [tempComment, ...prev]);
    setNewComment("");
    setMentions([]);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/comments`,
        { postId, text: newComment },
        { withCredentials: true }
      );
      const { comment, commentsCount } = res.data;
      setComments(prev =>
        prev.map(c =>
          c._id === tempComment._id ? comment : c
        )
      );
      updateCommentsCount(postId, commentsCount);
    } catch (err) {
      setComments(prev =>
        prev.filter(c => c._id !== tempComment._id)
      );
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
        const res = await axios.delete(
            `${BACKEND_URL}/api/comments/${commentId}`,
            {
                withCredentials: true,
            }
        );

        setComments(prev =>
            prev.filter(c => c._id !== commentId)
        );

        updateCommentsCount(
            postId,
            res.data.commentsCount
        );
    } catch (err) {
        console.error(err);
    }
};

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-[#191919] rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-2">
        <MessageSquare size={18} className="text-blue-500" />
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Comments</h3>
      </div>

      {/* Input Area */}
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
        <div className="relative group">
          <MentionTextarea
            value={newComment}
            onMentionsChange={(users) =>
              setMentions(
                users.map(user => ({
                  originalUsername: user.username,
                  user,
                }))
              )
            }
            onChange={setNewComment}
            placeholder="Share your thoughts..."
            rows={1}
            className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-zinc-800 text-white rounded-xl hover:bg-blue-700 transition-all"
          >
            <Send size={18} />
          </button>
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