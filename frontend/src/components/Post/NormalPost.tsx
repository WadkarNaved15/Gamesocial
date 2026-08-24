import React, { memo, useMemo, useEffect, useRef, useState, useContext } from "react";
import PostHeader from "./PostHeader";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/user";
import PostInteractions from "./PostInteractions";
import { useLikes } from "../../hooks/useLikes";
import MediaViewer from "../Media/MediaViewer";
import ConfirmDeleteModal from "../Home/ConfirmDeleteModal";
import { useWishlist } from "../../hooks/useWishlist";
import { toast } from "react-toastify";
import type { NormalPostProps } from "../../types/Post";
import { VideoPlaybackContext } from "../../context/VideoPlaybackContext";
import { useAudio } from "../../context/AudioContext";
import { Play, Loader2, AlertCircle, VolumeX, Volume2 } from "lucide-react";
import { trackEvent } from "../../utils/analytics";

const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[rgb(98,212,174)] hover:text-[rgb(78,192,154)] hover:underline break-words"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

/* ─────────────────────────────────────────────────────────────────────────
 * ASPECT RATIO DETECTION HELPER
 * Small, reusable piece of logic that maps a media asset's natural
 * dimensions onto a fixed set of "social feed" aspect-ratio buckets, so
 * single-media posts get an adaptive but predictable box shape instead of
 * a hard-coded 320px height.
 * ────────────────────────────────────────────────────────────────────── */

type AspectBucket = "21:9" | "16:9" | "4:3" | "1:1" | "4:5" | "9:16";

const ASPECT_CLASS_MAP: Record<AspectBucket, string> = {
  "21:9": "aspect-[21/9]",
  "16:9": "aspect-video", // Tailwind's built-in 16/9 alias
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
};

// Fallback bucket used while real dimensions are still loading.
// 4:5 (portrait-ish) tends to minimize visible layout jump either way.
const FALLBACK_ASPECT_CLASS = ASPECT_CLASS_MAP["4:5"];

const getAspectBucket = (ratio: number): AspectBucket => {
  if (ratio >= 1.9) return "21:9";   // ultra-wide
  if (ratio >= 1.5) return "16:9";   // standard landscape
  if (ratio >= 1.15) return "4:3";   // classic landscape
  if (ratio >= 0.9) return "1:1";    // square
  if (ratio <= 0.65) return "9:16";  // tall portrait / vertical video
  return "4:5";                      // portrait
};

interface AspectSourceAsset {
  type: string;
  url: string;
}

/**
 * Detects the natural aspect ratio of a single image/video asset (off-DOM,
 * so it doesn't interfere with the actually-rendered <img>/<video> element)
 * and returns the matching Tailwind aspect-ratio class for its container.
 */
function useSingleAssetAspectClass(asset?: AspectSourceAsset): string {
  const [aspectClass, setAspectClass] = useState<string>(FALLBACK_ASPECT_CLASS);

  useEffect(() => {
    if (!asset?.url) return;
    let cancelled = false;

    const applyDimensions = (width: number, height: number) => {
      if (cancelled || !width || !height) return;
      setAspectClass(ASPECT_CLASS_MAP[getAspectBucket(width / height)]);
    };

    if (asset.type === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = asset.url;
      video.onloadedmetadata = () => applyDimensions(video.videoWidth, video.videoHeight);
    } else {
      const img = new window.Image();
      img.src = asset.url;
      img.onload = () => applyDimensions(img.naturalWidth, img.naturalHeight);
    }

    return () => {
      cancelled = true;
    };
    // Re-run only when the asset itself changes.
  }, [asset?.url, asset?.type]);

  return aspectClass;
}

const NormalPost: React.FC<NormalPostProps> = ({
  _id,
  user,
  description,
  viewsCount,
  likesCount,
  isLiked,
  isWishlisted,
  onOpenDetails,
  onDeleteSuccess,
  commentsCount,
  disableInteractions,
  normalPost,
  createdAt,
}) => {
  const { activeVideo, setActiveVideo } = useContext(VideoPlaybackContext);
  const { isMuted, toggleMute, audioFocusId, setAudioFocusId } = useAudio();
  const isAudioActive =
  audioFocusId === null || audioFocusId === _id;
  const postRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user: currentUser } = useUser();
  const isOwner = currentUser?._id === user._id;
  const isAdmin = currentUser?.role === "admin";
  const [viewerOpen, setViewerOpen] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const navigate = useNavigate();
  const { likesCount: localLikesCount, isLiked: localIsLiked, handleLike } = useLikes(_id, BACKEND_URL);
  const { isWishlisted: localIsWishlisted, handleWishlist } = useWishlist(_id, BACKEND_URL);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [showReadMore, setShowReadMore] = useState(false);

  const rawAssets = normalPost?.assets || [];

  // ─── VIDEO OPTIMIZATION MAPPING ──────────────────────────────────────────────
  const displayAssets = useMemo(() => {
    return rawAssets.map(asset => {
      const isVideo = asset.type === "video";
      const isCompleted = isVideo && asset.processingStatus === "completed";
      const displayUrl = (isCompleted && asset.optimizedUrl) ? asset.optimizedUrl : asset.url;

      return {
        ...asset,
        url: displayUrl,
      };
    });
  }, [rawAssets]);
  // ─────────────────────────────────────────────────────────────────────────────

  const isSingleMedia = displayAssets.length === 1;
  const singleAsset = isSingleMedia ? displayAssets[0] : undefined;
  const singleAssetAspectClass = useSingleAssetAspectClass(singleAsset);

  const primaryVideoIndex = useMemo(() => {
    return displayAssets.findIndex(a => a.type === "video");
  }, [displayAssets]);

  /* -------------------- TIME FORMAT -------------------- */
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

  const handleDelete = async (postId: string) => {
    try {
      setIsDeleting(true);
      onDeleteSuccess?.(postId);

      await fetch(`${BACKEND_URL}/api/allposts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

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
    if (primaryVideoIndex === -1) return;

    const video = videoRefs.current[primaryVideoIndex];
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6 && !viewerOpen) {
          if (activeVideo && activeVideo !== video) {
            activeVideo.pause();
          }
          setActiveVideo(video);
          video.play().catch(() => { });
        } else {
          video.pause();
        }
      },
      { threshold: [0.6] }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [primaryVideoIndex, viewerOpen]);

  useEffect(() => {
    videoRefs.current = [];
  }, [displayAssets]);

  useEffect(() => {
    if (!viewerOpen) return;

    videoRefs.current.forEach(video => {
      if (video) video.pause();
    });
  }, [viewerOpen]);

  /* -------------------- GRID LOGIC (multi-media only) -------------------- */
  const getGridClass = (count: number) => {
    if (count === 2) return "grid-cols-2";
    return "grid-cols-2 grid-rows-2";
  };


  useEffect(() => {
  const checkOverflow = () => {
    if (textRef.current && !isExpanded) {
      // If scrollHeight is strictly greater than clientHeight, the text is being truncated
      setShowReadMore(
        textRef.current.scrollHeight > textRef.current.clientHeight
      );
    }
  };

  checkOverflow();
  window.addEventListener("resize", checkOverflow);
  
  return () => window.removeEventListener("resize", checkOverflow);
}, [description, isExpanded]);

  return (
    <article
      ref={postRef}
      onClick={() => {
        if (viewerOpen) return; 
        onOpenDetails?.();
      }}
      // className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-transparent hover:bg-white/[0.03] cursor-pointer transition-colors duration-200"
      className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-white/[0.03] cursor-pointer transition-colors duration-200"
    >
      <div className="flex gap-3 p-4">
        {/* AVATAR */}
        <img
          src={user.avatar || "/default_avatar.png"}
          alt={user.username}
          onClick={(e) => {
            e.stopPropagation();
            trackEvent({
              eventType: "profile_view",
              targetType: "user",
              targetId: user._id,
              metadata: { from: "post" ,
                postId: _id,
              },
            });
            navigate(`/profile/${user.username}`);
          }}
          className="h-10 w-10 rounded-full object-cover mt-1"
        />

        {/* CONTENT */}
        <div className="flex flex-col flex-1 min-w-0">
          <PostHeader
            username={user.username}
            displayName={user.displayName || user.username} // Use displayName if available, otherwise fallback to username
            timestamp={timestamp}
            price={0}
            type="normal_post"
            postId={_id}
            isOwner={isOwner}
            isAdmin={isAdmin} // Pass the isAdmin prop to PostHeader
            isRigzer={user.isRigzer} // Pass the isRigzer prop to PostHeader
            onDelete={() => setDeleteOpen(true)}
            onProfileClick={() => {
                trackEvent({
                  eventType: "profile_view",
                  targetType: "user",
                  targetId: user._id,
                  metadata: { from: "post" ,
                    postId: _id,
                  },
                });
                navigate(`/profile/${user.username}`);
              }}
          />

          {description && (
  <div className="mb-2">
    <p
      ref={textRef}
      className={`text-gray-200 leading-normal whitespace-pre-wrap transition-all ${
        !isExpanded ? "line-clamp-6" : ""
      }`}
    >
      {renderTextWithLinks(description)}
    </p>

    {(showReadMore || isExpanded) && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="text-[rgb(98,212,174)] hover:text-[rgb(78,192,154)] font-semibold text-sm mt-1 focus:outline-none"
      >
        {isExpanded ? "Show less" : "Show more"}
      </button>
    )}
  </div>
)}

          {/* -------------------- SINGLE MEDIA (adaptive) -------------------- */}
          {isSingleMedia && singleAsset && (() => {
            const asset = singleAsset;
            const isProcessing = asset.type === "video" && (asset.processingStatus === "pending" || asset.processingStatus === "processing");
            const isFailed = asset.type === "video" && asset.processingStatus === "failed";

            return (
              <div
                className="mt-3 w-full flex justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewerIndex(0);
                  setViewerOpen(true);
                }}
              >
                <div
                  className={`
                    relative w-full
                    ${singleAssetAspectClass}
                    max-h-[450px]
                    rounded-2xl
                    overflow-hidden
                    border border-white/[0.08]
                    bg-black/20
                  `}
                >
                  {asset.type === "video" ? (
                    <div className="w-full h-full overflow-hidden relative group">
                      <video
                        ref={(el) => {
                          if (el) {
                            videoRefs.current[0] = el;
                          }
                        }}
                        muted={!isAudioActive || isMuted}
                        playsInline
                        loop
                        preload="metadata"
                        poster={asset.thumbnailUrl}
                        className="w-full h-full object-contain"
                        src={asset.url}
                      />

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        className="absolute bottom-3 right-3 z-50 p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100"
                      >
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>
            );
          })()}

          {/* -------------------- MULTI MEDIA GRID (unchanged behavior) -------------------- */}
          {displayAssets.length > 1 && (
            <div
              className={`
                group relative
                mt-3
                w-full
                h-[320px]
                rounded-2xl
                overflow-hidden
                border border-white/[0.08]
                grid
                ${getGridClass(displayAssets.length)}
                gap-[2px]
                bg-black/20
              `}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails?.();
              }}
            >
              {displayAssets.slice(0, 4).map((asset, index) => {
                const isProcessing = asset.type === "video" && (asset.processingStatus === "pending" || asset.processingStatus === "processing");
                const isFailed = asset.type === "video" && asset.processingStatus === "failed";

                return (
                  <div
                    key={index}
                    className={`
                      relative w-full h-full
                      ${displayAssets.length === 3 && index === 0 ? "row-span-2" : ""}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex(index);
                      setViewerOpen(true);
                    }}
                  >
                    {asset.type === "video" ? (
                      <div className="w-full h-full overflow-hidden relative group">

                        <video
                          ref={(el) => {
                            if (el) {
                              videoRefs.current[index] = el;
                            }
                          }}
                          muted={!isAudioActive || isMuted}
                          playsInline
                          loop
                          preload="metadata"
                          poster={asset.thumbnailUrl}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          src={asset.url}
                        />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMute();
                          }}
                          className="absolute bottom-7 right-2 z-50 p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 transition-opacity opacity-0 group-hover:opacity-100 sm:opacity-100"
                        >
                          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>

                        {asset.type === "video" && index !== primaryVideoIndex && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
                            <Play className="h-10 w-10 text-white/80 drop-shadow-md" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    )}
                  </div>
                );
              })}
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
          {viewerOpen && (
            <MediaViewer
              assets={displayAssets}
              startIndex={viewerIndex}
              onClose={() => setViewerOpen(false)}
            />
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
  );
};

export default memo(NormalPost);