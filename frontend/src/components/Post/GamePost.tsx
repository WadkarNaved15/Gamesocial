import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Gamepad2, Sparkles, Loader2, AlertCircle, Users, VolumeX, Volume2 } from 'lucide-react';
import { useQueue } from '../../context/QueueContext';
import { useUI } from '../../context/UIContext';
import { useLikes } from '../../hooks/useLikes';
import { useWishlist } from '../../hooks/useWishlist';
import ConfirmDeleteModal from '../Home/ConfirmDeleteModal';
import { useUser } from "../../context/user";
import PostHeader from './PostHeader';
import PostInteractions from './PostInteractions';
import { toast } from "react-toastify";
import { getStreamEligibility } from "../../utils/streamEligibility";
import type { StreamEligibility } from "../../utils/streamEligibility";
import { trackEvent } from "../../utils/analytics";
import { useAudio } from "../../context/AudioContext";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isMuted, toggleMute, audioFocusId, setAudioFocusId } = useAudio();

  const { user: currentUser } = useUser();
  const isOwner = currentUser?._id === user._id;
  const isAudioActive =
  audioFocusId === null || audioFocusId === _id;
  const hasPlayedDemo = gamePost?.demoConsumed === true;

  const [eligibility, setEligibility] = useState<StreamEligibility>({
    checked: false,
    allowed: false,
    reasons: [],
    speedMbps: null,
    testMs: null,
  });
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  let viewStartTime = useRef<number | null>(null);

  const { likesCount: localLikesCount, isLiked: localIsLiked, handleLike } = useLikes(_id, BACKEND_URL);
  const { isWishlisted: localIsWishlisted, handleWishlist } = useWishlist(_id, BACKEND_URL);
  const { setIsAdPlaying } = useUI();

  const { queue, startSession } = useQueue();
  const navigate = useNavigate();

  const hasActiveSession = queue.sessionId !== null && ['waiting', 'allocation_ready', 'starting', 'running'].includes(queue.status);

  const playDisabled = checkingEligibility || isStarting || hasActiveSession;

  const playReason =
    eligibility.checked && !eligibility.allowed
      ? eligibility.reasons[0]
      : hasActiveSession
        ? "Complete or cancel current session first."
        : "";

  // ─── VIDEO OPTIMIZATION LOGIC ────────────────────────────────────────────────
  const videoDemo = gamePost?.videoDemo;
  const processingStatus = videoDemo?.processingStatus;
  
  const isVideoProcessing = processingStatus === 'pending' || processingStatus === 'processing';
  const isVideoCompleted = processingStatus === 'completed';
  const isVideoFailed = processingStatus === 'failed';

  // Fallback pattern: Prefer optimized URL if ready, otherwise use original URL.
  const videoUrl = isVideoCompleted && videoDemo?.optimizedUrl ? videoDemo.optimizedUrl : videoDemo?.url;
  const thumbnailUrl = videoDemo?.thumbnailUrl;
  const hasVideo = !!videoUrl;
  // ─────────────────────────────────────────────────────────────────────────────

  const totalCredits = (gamePost.creditBudget?.usedCredits || 0) + (gamePost.creditBudget?.remainingCredits || 0);
  const possibleSessions = Math.floor(totalCredits / 10);
  const completedSessions = gamePost.gameMetrics?.totalSessions || 0;

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
    if (isStarting || hasActiveSession || checkingEligibility) return;

    setCheckingEligibility(true);

    try {
      const result = await getStreamEligibility();
      setEligibility(result);

      if (!result.allowed) {
        return;
      }

      setIsStarting(true);

      trackEvent({
        eventType: "game_launch",
        targetType: "game_post",
        targetId: _id,
      });

      const sessionId = await startSession(_id);
      if (sessionId) {
        setIsAdPlaying(true);
      } else {
        setIsStarting(false);
      }
    } catch (err) {
      console.error("Failed to start game:", err);
      toast.error("Could not verify your device or internet.");
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      setIsDeleting(true);
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

  useEffect(() => {
    if (!queue.sessionId) {
      setIsStarting(false);
    }
  }, [queue.sessionId]);

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play().catch((err: any) => {
              console.warn("Browser blocked autoplay:", err);
            });
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(videoRef.current);

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  const PlayButton = () =>
    hasPlayedDemo ? (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenDetails?.();
        }}
        style={{
          background: "linear-gradient(to bottom right, #3D7A6E, #000000)",
        }}
        className="text-white px-3 py-2 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-1.5 shrink-0 active:scale-[0.98]"
      >
        <Gamepad2 size={14} />
        <span className="font-semibold text-xs">Demo Played</span>
      </button>
    ) : (
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
        className="text-white px-3 py-2 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-1.5 shrink-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Users size={14} className="animate-pulse" />
        <span className="font-semibold text-xs">
          {checkingEligibility
            ? "Checking..."
            : isStarting
              ? "Starting..."
              : hasActiveSession
                ? "Busy"
                : eligibility.checked && !eligibility.allowed
                  ? "Unavailable"
                  : "Play"}
        </span>
        <span className="text-[11px] font-medium opacity-80 border-l border-white/30 pl-1.5 ml-0.5">
          {completedSessions}/{possibleSessions}
        </span>
      </button>
    );

  return (
    <>
      <article
        ref={postRef}
        onClick={() => {
          onOpenDetails?.();
        }}
        // className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-transparent hover:bg-white/[0.03] cursor-pointer transition-colors duration-200"
        className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-white/[0.03] cursor-pointer transition-colors duration-200"
      >
        <div className="flex gap-3 p-4">
          <img
            src={user.avatar || "/default_avatar.png"}
            alt={user.username}
            onClick={(e) => {
              e.stopPropagation();
              trackEvent({
                eventType: "profile_view",
                targetType: "user",
                targetId: user._id,
                metadata: { from: "post",
                  postId: _id,
                 },
              });
              navigate(`/profile/${user.username}`);
            }}
            className="h-10 w-10 rounded-full object-cover mt-1"
          />

          <div className="flex flex-col flex-1 min-w-0">
            <PostHeader
              type='game_post'
              username={user.username}
              displayName={user.displayName || user.username} 
              timestamp={timestamp}
              price={gamePost?.price || 0}
              isOwner={isOwner}
              onProfileClick={() => {
                trackEvent({
                  eventType: "profile_view",
                  targetType: "user",
                  targetId: user._id,
                  metadata: { from: "post",
                    postId: _id,
                   },
                });
                navigate(`/profile/${user.username}`);
              }}
              onDelete={() => setDeleteOpen(true)}
            />

            {description && (
              <div>
                <p
                  className={`text-gray-200 leading-relaxed whitespace-pre-wrap transition-all ${!isExpanded ? "line-clamp-2" : ""}`}
                >
                  {description}
                </p>

                {description.length > 100 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="text-[rgb(98,212,174)] hover:text-[rgb(78,192,154)] font-semibold text-sm mt-1"
                  >
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}

            {gamePost && (
              <div className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-gradient-to-b from-[#1c1c1c] to-[#0a0a0a]">

                <div className="relative w-full h-[380px] overflow-hidden bg-gradient-to-b from-[#1e1e1e] to-[#0c0c0c]">

                  {hasVideo ? (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        poster={thumbnailUrl} // Loads instantly while video buffers
                        muted={!isAudioActive || isMuted}
                        loop
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        className="absolute bottom-4 right-4 z-50 p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20"
                      >
                        {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      </button>

                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `
                            linear-gradient(
                              to bottom,
                              rgba(20,20,20,0.55) 0%,
                              rgba(10,10,10,0.08) 28%,
                              rgba(0,0,0,0.0)    50%,
                              rgba(0,0,0,0.08)   72%,
                              rgba(0,0,0,0.52)  100%
                            )
                          `,
                        }}
                      />

                      <div className="absolute top-4 left-4 z-40 flex items-center gap-3">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                          {gamePost.gameName}
                        </h3>
                        <PlayButton />
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none">
                          {gamePost.gameName}
                        </h3>
                        <PlayButton />
                      </div>
                    </div>
                  )}

                </div>

                {/* Eligibility warning */}
                {eligibility.checked && !eligibility.allowed && eligibility.reasons.length > 0 && (
                  <div className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-2 text-amber-300">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <div className="text-xs leading-5">
                        {eligibility.reasons.some((r) =>
                          r.includes("Mobile support is coming soon")
                        ) ? (
                          <p className="font-semibold">
                            Mobile support is coming soon. Please use a laptop or desktop.
                          </p>
                        ) : (
                          <>
                            <p className="font-semibold">You cannot play this stream yet:</p>
                            <ul className="mt-1 list-disc pl-4 space-y-1">
                              {eligibility.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting indicator */}
                {hasActiveSession && queue.status === 'waiting' && (
                  <div className="mt-4 w-full bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                    <p className="text-xs text-blue-400 font-medium flex items-center gap-2 justify-center">
                      <Loader2 size={14} className="animate-spin" />
                      Getting your instance ready ...
                    </p>
                  </div>
                )}

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