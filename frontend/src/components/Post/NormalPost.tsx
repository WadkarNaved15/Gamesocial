import React, { memo, useMemo, useEffect, useRef, useState } from "react";
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
import { useContext } from "react";
import { Play, Loader2, AlertCircle } from "lucide-react"; // 🔥 Added Icons for processing state
import { trackEvent } from "../../utils/analytics";

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
  const postRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user: currentUser } = useUser();
  const isOwner = currentUser?._id === user._id;
  const [viewerOpen, setViewerOpen] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const navigate = useNavigate();
  const { likesCount: localLikesCount, isLiked: localIsLiked, handleLike } = useLikes(_id, BACKEND_URL);
  const {
    isWishlisted: localIsWishlisted,
    handleWishlist
  } = useWishlist(_id, BACKEND_URL);

  const rawAssets = normalPost?.assets || [];

  // ─── VIDEO OPTIMIZATION MAPPING ──────────────────────────────────────────────
  // Intercept the raw assets and swap the URL to the optimized version if ready.
  // This ensures the grid AND the MediaViewer both get the fast-loading 3MB video.
  const displayAssets = useMemo(() => {
    return rawAssets.map(asset => {
      const isVideo = asset.type === "video";
      const isCompleted = isVideo && asset.processingStatus === "completed";
      
      const displayUrl = (isCompleted && asset.optimizedUrl) ? asset.optimizedUrl : asset.url;
      
      return {
        ...asset,
        url: displayUrl, // Overridden with the smartest available URL
      };
    });
  }, [rawAssets]);
  // ─────────────────────────────────────────────────────────────────────────────

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

  const timestamp = useMemo(
    () => getRelativeTime(createdAt),
    [createdAt]
  );

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

  /* -------------------- GRID LOGIC -------------------- */
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    return "grid-cols-2 grid-rows-2";
  };

  return (
    <article
      ref={postRef}
      onClick={() => {
        if (viewerOpen) return; // 🔥 BLOCK when overlay is open
        onOpenDetails?.();
      }}
      className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-transparent hover:bg-white/[0.03] cursor-pointer transition-colors duration-200"
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
              metadata: { from: "post" },
            });
            navigate(`/profile/${user.username}`);
          }}
          className="h-10 w-10 rounded-full object-cover mt-1"
        />

        {/* CONTENT */}
        <div className="flex flex-col flex-1 min-w-0">
          <PostHeader
            username={user.username}
            timestamp={timestamp}
            price={0}
            type="normal_post"
            isOwner={isOwner}
            onDelete={() => setDeleteOpen(true)}
          />

          {description && (
            <div className="mt-2 mb-4">
              <p
                className={`text-gray-200 leading-relaxed whitespace-pre-wrap transition-all ${
                  !isExpanded ? "line-clamp-2" : ""
                }`}
              >
                {description}
              </p>

              {/* Only show button if description is long enough to need it */}
              {description.length > 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents opening post details when clicking the button
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-sky-400 hover:text-sky-300 font-semibold text-sm mt-1 focus:outline-none"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* -------------------- X STYLE MEDIA GRID -------------------- */}
          {displayAssets.length > 0 && (
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
                mb-4
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
                        
                        {/* Creator Processing Overlay */}
                        {isOwner && isProcessing && (
                          <div className="absolute top-2 right-2 z-10 bg-black/70 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10">
                            <Loader2 size={10} className="animate-spin text-sky-400" />
                            <span>Optimizing...</span>
                          </div>
                        )}
                        {isOwner && isFailed && (
                          <div className="absolute top-2 right-2 z-10 bg-red-600/80 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-white/10">
                            <AlertCircle size={10} />
                            <span>Opt Failed</span>
                          </div>
                        )}

                        <video
                          ref={(el) => {
                            if (el) {
                              videoRefs.current[index] = el;
                            }
                          }}
                          muted
                          playsInline
                          loop
                          preload="metadata"
                          poster={asset.thumbnailUrl} // 🔥 Generated thumbnail prevents black boxes
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          src={asset.url}
                        />

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

          {/* -------------------- INTERACTIONS -------------------- */}
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
              assets={displayAssets} // 🔥 Pass mapped assets so the modal plays optimized versions
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