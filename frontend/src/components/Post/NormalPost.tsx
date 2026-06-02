import React, { memo, useMemo, useEffect, useRef, useState } from "react";
import PostHeader from "./PostHeader";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/user";
import PostInteractions from "./PostInteractions";
import { useLikes } from "../../hooks/useLikes";
import MediaViewer from "../Media/MediaViewer"
import ConfirmDeleteModal from "../Home/ConfirmDeleteModal";
import { useWishlist } from "../../hooks/useWishlist";
import { toast } from "react-toastify";
import type { NormalPostProps } from "../../types/Post";
import { VideoPlaybackContext } from "../../context/VideoPlaybackContext";
import { useContext } from "react";
import { Play } from "lucide-react";

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

  const assets = normalPost?.assets || [];
  const primaryVideoIndex = useMemo(() => {
    return assets.findIndex(a => a.type === "video");
  }, [assets]);

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
  }, [assets]);

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
      className="
  relative w-full
  border border-gray-200 dark:border-white/10
  border-l-0 border-r-0
  sm:border-l sm:border-r
  bg-white dark:bg-[#191919]
  hover:bg-[#F7F9F9] dark:hover:bg-[#16181C]
  cursor-pointer
"
    >

      <div className="flex gap-3 px-4 py-3">
        {/* AVATAR */}
        <img
          src={user.avatar || "/default_avatar.png"}
          alt={user.username}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${user.username}`);
          }}
          className="h-10 w-10 rounded-full object-cover"
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
                className={`text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap transition-all ${!isExpanded ? "line-clamp-2" : ""
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
                  className="text-sky-500 hover:text-sky-600 font-semibold text-sm mt-1 focus:outline-none"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* -------------------- X STYLE MEDIA GRID -------------------- */}
          {assets.length > 0 && (
            <div
              className={`
                mt-3
                w-full
                h-[320px]
                rounded-2xl
                overflow-hidden
                border border-gray-200 dark:border-gray-700
                grid
                ${getGridClass(assets.length)}
                gap-[2px]
                bg-[#191919]
              `}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails?.();
              }}
            >
              {assets.slice(0, 4).map((asset, index) => (
                <div
                  key={index}
                  className={`
                    relative w-full h-full
                    ${assets.length === 3 && index === 0 ? "row-span-2" : ""}
                 `}
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewerIndex(index);
                    setViewerOpen(true);
                    e.stopPropagation();
                  }}
                >

                  {asset.type === "video" ? (
                    <div className="w-full h-full overflow-hidden relative group"> {/* added group */}
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
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        src={asset.url}
                      />


                      {asset.type === "video" && index !== primaryVideoIndex && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Play className="h-10 w-10 text-white/80" />
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
              ))}
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
              assets={assets}
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
