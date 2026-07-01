import React, { memo, useMemo, useEffect, useRef, useState } from 'react';
import { useLikes } from "../../hooks/useLikes";
import { useWishlist } from '../../hooks/useWishlist';
import PostHeader from "./PostHeader";
import PostInteractions from "./PostInteractions";
import CommentSection from "./CommentSection";
import ConfirmDeleteModal from '../Home/ConfirmDeleteModal';
import "@google/model-viewer";
import type { ExePostProps } from "../../types/Post";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useUser } from "../../context/user";
import { trackEvent } from '../../utils/analytics';

const ExePost: React.FC<ExePostProps> = ({
  user,
  description,
  viewsCount,
  uniqueViewsCount,
  likesCount,
  isLiked,
  isWishlisted,
  // gameUrl,
  onOpenDetails,
  onDeleteSuccess,
  createdAt,
  modelPost,
  detailed = false,
  commentsCount,
  _id,
  avatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false); // ✅ toggle comment section
  const postRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useUser();
  const isOwner = currentUser?._id === user._id;
  const [localCommentsCount, setLocalCommentsCount] = useState<number>(commentsCount ?? 0);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const { likesCount: localLikesCount, isLiked: localIsLiked, handleLike } = useLikes(_id, BACKEND_URL);
  const {
    isWishlisted: localIsWishlisted,
    handleWishlist
  } = useWishlist(_id, BACKEND_URL);
  const navigate = useNavigate();
  const location = useLocation();
  let viewStartTime = useRef<number | null>(null);
  const asset = modelPost?.assets?.[0];

  const modelUrl =
    asset?.optimization?.status === "completed"
      ? asset.optimizedUrl
      : asset?.originalUrl;
  const price = modelPost?.price;

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

  const getRelativeTime = (date: string | Date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    // 🔥 If within the same day (< 24 hours)
    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;

    // 🔥 If older than a day → show Month + Day like "Nov 31"
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric"
    };

    return created.toLocaleDateString("en-US", options);
  };

  const timestamp = useMemo(() => getRelativeTime(createdAt), [createdAt]);

  // Auto show comments in detail view 
  useEffect(() => {
    if (detailed) setShowComments(true);
  }, [detailed]);

return (
    <article
      ref={postRef}
      onClick={(e) => {
        if (detailed) return;
        if ((e.target as HTMLElement).closest("button")) return;
        onOpenDetails?.();
      }}
      className="relative w-full border border-white/[0.06] border-l-0 border-r-0 sm:border-l sm:border-r bg-white/[0.03] cursor-pointer transition-colors duration-200 py-4"
    >
      {/* 1. TOP SECTION: Avatar, Header & Description */}
      <div className="flex gap-3 px-4">
        {/* Avatar */}
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
          className="h-10 w-10 shrink-0 rounded-full object-cover mt-1"
        />

        {/* Text Content */}
        <div className="flex flex-col flex-1 min-w-0">
          <PostHeader
            username={user.username}
            displayName={user.displayName || user.username} // Use displayName if available, otherwise fallback to username
            timestamp={timestamp}
            price={price ?? 0}
            type='model_post'
            isOwner={isOwner}
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
            <div>
              <p className={`text-gray-200 leading-relaxed whitespace-pre-wrap transition-all ${!isExpanded ? "line-clamp-2" : ""}`}>
                {description}
              </p>
              {description.length > 100 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="text-sky-400 hover:text-sky-300 font-semibold text-sm focus:outline-none"
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIDDLE SECTION: Full-Width 3D Model (No Borders) */}
      {modelUrl && (
        <div 
          className={`group relative mt-2 flex justify-center overflow-hidden w-full h-[450px] bg-black/20 ${
            detailed ? "grayscale" : ""
          }`}
        >
          {/* @ts-ignore */}
          <model-viewer
            src={modelUrl}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            camera-controls
            auto-rotate
            autoplay
            animation-name="*"
            exposure="1.2"
            environment-image="neutral"
            field-of-view="25deg" 
            shadow-intensity="1"
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      )}

      {/* 3. BOTTOM SECTION: Post Interactions & Comments */}
      <div className="flex gap-3 px-4">
        {/* Invisible spacer to keep interactions aligned with the text column above (Twitter style) */}
        <div className="h-10 w-10 shrink-0 opacity-0 hidden sm:block"></div>
        
        <div className="flex flex-col flex-1 min-w-0">
          <div onClick={(e) => e.stopPropagation()}>
            <PostInteractions
              postId={_id}
              views={viewsCount}
              likes={localLikesCount}
              comments={commentsCount ?? 0}
              isLiked={localIsLiked}
              onLike={handleLike}
              isWishlisted={localIsWishlisted}
              onWishlist={handleWishlist}
              onCommentToggle={() => onOpenDetails?.()} 
            />
          </div>

          {showComments && (
            <div onClick={(e) => e.stopPropagation()} className="mt-2">
              <CommentSection postId={_id} BACKEND_URL={BACKEND_URL} />
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
  );
};

export default ExePost;