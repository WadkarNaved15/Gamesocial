import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Gamepad2, Sparkles, Loader2, AlertCircle, Users } from 'lucide-react';
import { useQueue } from '../../context/QueueContext';
import { useUI } from '../../context/UIContext';
import { useLikes } from '../../hooks/useLikes';
import { useWishlist } from '../../hooks/useWishlist';
import ConfirmDeleteModal from '../Home/ConfirmDeleteModal';
import { useUser } from "../../context/user";
import PostHeader from './PostHeader';
import PostInteractions from './PostInteractions';
import {toast} from "react-toastify";
import { watchStreamEligibility  } from "../../utils/streamEligibility";
import type { StreamEligibility } from "../../utils/streamEligibility";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

interface GamePostProps {
  user: any;
  description: string;
  createdAt: string;
  viewsCount?: number;
  uniqueViewsCount?: number;
  commentsCount: number;
  likesCount: number;
  isLiked: boolean;
  isWishlisted: boolean;
  onOpenDetails: () => void;
  onDeleteSuccess: (postId: string) => void;
  disableInteractions: boolean;
  _id: string;
  gamePost: any;
}

const GamePost: React.FC<GamePostProps> = ({
  user,
  description,
  createdAt,
  uniqueViewsCount,
  viewsCount,
  commentsCount,
  likesCount,
  isLiked,
  isWishlisted,
  onOpenDetails,
  onDeleteSuccess,
  disableInteractions,
  _id,
  gamePost,
}) => {
  const postRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useUser();
  const isOwner = currentUser?._id === user._id;

const [eligibility, setEligibility] = useState<StreamEligibility>({
  checked: false,
  allowed: false,
  reasons: [],
  speedMbps: null,
  testMs: null,
  retryable: false,
  lastCheckedAt: null,
});

  let viewStartTime = useRef<number | null>(null);

  const { likesCount: localLikesCount, isLiked: localIsLiked, handleLike } = useLikes(_id, BACKEND_URL);
  const { isWishlisted: localIsWishlisted, handleWishlist } = useWishlist(_id, BACKEND_URL);
  const { setIsAdPlaying } = useUI();

  const { queue, startSession } = useQueue();
  const navigate = useNavigate();

  


  // ✅ Check if ANY session exists (prevent starting new ones)
  const hasActiveSession = queue.sessionId !== null && ['waiting', 'allocation_ready', 'starting', 'running'].includes(queue.status);

  const playDisabled =
  !eligibility.checked ||
  !eligibility.allowed ||
  isStarting ||
  hasActiveSession;

  const playReason = !eligibility.checked
  ? "Checking device and internet..."
  : hasActiveSession
    ? "Complete or cancel current session first."
    : eligibility.reasons[0] || "";

  const getRelativeTime = (date: string | Date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;

    return created.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const timestamp = useMemo(() => getRelativeTime(createdAt), [createdAt]);

  const handleStartGame = async () => {
    if (isStarting || hasActiveSession) return;
    setIsStarting(true);

    try {
      const sessionId = await startSession(_id);
      if (sessionId) {
        setIsAdPlaying(true);
      }
    } catch (err) {
      console.error("Failed to start game:", err);
      setIsStarting(false);
    }
  };
    const handleDelete = async (postId: string) => {
      try {
        setIsDeleting(true);
  
        // optimistic removal
        onDeleteSuccess?.(postId);
  
        await fetch(
          `${BACKEND_URL}/api/allposts/${postId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
  
        setDeleteOpen(false);
        toast.success("Post deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete post please try again later");
      } finally {
        setIsDeleting(false);
      }
    };
  // Analytics tracking
  const startViewing = async () => {
    viewStartTime.current = Date.now();
    fetch(`${BACKEND_URL}/api/interactions/playtime-start`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: _id })
    }).catch(() => { });
  };

  const stopViewing = async () => {
    if (!viewStartTime.current) return;
    const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
    viewStartTime.current = null;
    fetch(`${BACKEND_URL}/api/interactions/playtime-end`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: _id, duration })
    }).catch(() => { });
  };

  const markViewed = async () => {
    fetch(`${BACKEND_URL}/api/interactions/view`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: _id })
    }).catch(() => { });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startViewing();
          markViewed();
        } else {
          stopViewing();
        }
      },
      { threshold: 0.5 }
    );
    if (postRef.current) observer.observe(postRef.current);
    return () => observer.disconnect();
  }, []);

useEffect(() => {
  const stop = watchStreamEligibility(setEligibility);
  return stop;
}, []);

  useEffect(() => {
    if (!queue.sessionId) {
      setIsStarting(false);
    }
  }, [queue.sessionId]);

  return (
    <>
      {/* GAME POST CARD */}
      <article
        ref={postRef}
        onClick={() => {
          onOpenDetails?.();
        }}
        className="relative w-full border border-gray-200 dark:border-white/10 border-l-0 border-r-0 sm:border-l sm:border-r bg-white dark:bg-[#191919] hover:bg-[#F7F9F9] dark:hover:bg-[#16181C] cursor-pointer"
      >
        <div className="flex gap-3 p-4">
          {/* Avatar */}
          <img
            src={user.avatar || "/default_avatar.png"}
            alt={user.username}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${user.username}`);
            }}
            className="h-10 w-10 rounded-full object-cover mt-1"
          />

          <div className="flex flex-col flex-1 min-w-0">
            <PostHeader
              type='game_post'
              username={user.username}
              timestamp={timestamp}
              price={gamePost?.price || 0}
              isOwner={isOwner}
              onDelete={() => setDeleteOpen(true)}
            />

            {description && (
              <div className="mt-2 mb-4">
                <p
                  className={`text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap transition-all ${!isExpanded ? "line-clamp-2" : ""
                    }`}
                >
                  {description}
                </p>

                {description.length > 100 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="text-sky-500 hover:text-sky-600 font-semibold text-sm mt-1"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}

            {/* GAME CARD */}
            {gamePost && (
              <div className="group relative rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-purple-500/10 opacity-50" />

                <div className="relative p-6 flex flex-col items-start justify-start text-left w-full">
                  {/* <div className="w-16 h-16 bg-[#F9FAFB] dark:bg-[#191919] rounded-2xl shadow-xl flex items-center justify-center mb-4 border border-gray-100 dark:border-zinc-800 group-hover:scale-110 transition-transform duration-300">
                    <Gamepad2 className="text-sky-500 w-8 h-8" />
                  </div> */}

                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-black text-black dark:text-white tracking-tight leading-none">
                      {gamePost.gameName}
                    </h3>
                    {/* Queue Badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartGame();
                      }}
                      disabled={playDisabled}
                      title={playReason}
                      style={{
                        background: playDisabled
                          ? "linear-gradient(to bottom right, #52525b, #18181b)"
                          : "linear-gradient(to bottom right, #3D7A6E, #000000)",
                      }}
                      className="
                        text-white px-3 py-2.5 rounded-2xl
                        shadow-lg hover:shadow-xl
                        transition-all hover:scale-105
                        flex items-center gap-2 shrink-0
                        active:scale-[0.98]
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <Users size={14} />
                      <span className="font-semibold text-xs">
                        {!eligibility.checked
                          ? "Checking..."
                          : isStarting
                            ? "Starting..."
                            : hasActiveSession
                              ? "Busy"
                              : playDisabled
                                ? "Unavailable"
                                : "Play Now"}
                      </span>
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </div>
                    </button>

                    {/* Game Name */}
                  </div>

                  {playDisabled && eligibility.checked && eligibility.reasons.length > 0 && (
                  <div className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <div className="text-xs leading-5">
                        <p className="font-semibold">You cannot play this stream yet:</p>
                        <ul className="mt-1 list-disc pl-4 space-y-1">
                          {eligibility.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                  {/* <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      v{gamePost.version}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-sky-500 uppercase tracking-widest">
                      <Sparkles size={10} />
                      Instant Stream
                    </div>
                  </div> */}

                  {/* Status indicator while waiting */}
                  {hasActiveSession && queue.status === 'waiting' && (
                    <div className="mt-4 w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2 justify-center">
                        <Loader2 size={14} className="animate-spin" />
                        Getting your instance ready ...
                      </p>
                    </div>
                  )}

                  {/* Play Button - ✅ Disabled if any session exists */}
                  {/* <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartGame();
                    }}
                    disabled={isStarting || hasActiveSession}
                    title={hasActiveSession ? "Complete or cancel current session first" : ""}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3.5
                      bg-sky-500 hover:bg-sky-600 text-white font-black rounded-xl
                      transition-all shadow-lg shadow-sky-500/20
                      active:scale-[0.98]
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play size={18} fill="currentColor" />
                    {isStarting ? "STARTING..." : hasActiveSession ? "BUSY" : "PLAY NOW"}
                  </button>

                  <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-4 font-medium italic">
                    No download required • Powered by Cloud Instances
                  </p> */}
                </div>
              </div>
            )}

            {!disableInteractions && (
              <div onClick={(e) => e.stopPropagation()}>
                <PostInteractions
                  postId={_id}
                  views={viewsCount}
                  likes={localLikesCount}
                  comments={commentsCount ?? 0}
                  isLiked={localIsLiked}
                  isWishlisted={localIsWishlisted}
                  onLike={handleLike}
                  onWishlist={handleWishlist}
                  onCommentToggle={() => onOpenDetails?.()}
                />
              </div>
            )}
          </div>
        </div>
        <ConfirmDeleteModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => handleDelete(_id)}
          loading={isDeleting}
        />
      </article>
    </>
  );
};


export default GamePost;