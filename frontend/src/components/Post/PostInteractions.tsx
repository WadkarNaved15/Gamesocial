import React, { useState, memo } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Eye } from "lucide-react";
import { useUser } from "../../context/user";
import ShareActionModal from "../Home/ShareActionModal";
import { trackEvent } from "../../utils/analytics";

interface PostInteractionsProps {
  postId: string;
  likes: number;
  comments: number;
  views?: number;
  isLiked?: boolean;
  isWishlisted?: boolean;
  onLike?: () => void;
  onWishlist?: () => void;
  onCommentToggle?: () => void;
  onShare?: () => void;
}

const formatCount = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

const PostInteractions: React.FC<PostInteractionsProps> = ({
  likes,
  comments,
  views = 0,
  isLiked = false,
  isWishlisted = false,
  onLike,
  onWishlist,
  onCommentToggle,
  postId,
}) => {
  const { user } = useUser();
  const [shareOpen, setShareOpen] = useState(false);

  const currentUserId = user?._id;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onLike}
            className={`flex items-center transition-colors ${
              isLiked
                ? "text-red-500"
                : "text-gray-500 dark:text-gray-400 hover:text-red-400"
            }`}
            aria-label="Like post"
          >
            <Heart className={`h-5 w-5 mr-1 ${isLiked ? "fill-red-500" : ""}`} />
            <span>{likes}</span>
          </button>

          <button
            onClick={onCommentToggle}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-500 transition-colors"
            aria-label="Comment"
          >
            <MessageCircle className="h-5 w-5 mr-1" />
            <span>{comments}</span>
          </button>

          <button
            onClick={onWishlist}
            className={`flex items-center transition-colors ${
              isWishlisted
                ? "text-yellow-500"
                : "text-gray-500 dark:text-gray-400 hover:text-yellow-400"
            }`}
            aria-label="Add to wishlist"
          >
            <Bookmark
              className={`h-5 w-5 mr-1 ${isWishlisted ? "fill-yellow-500" : ""}`}
            />
          </button>

          <button
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-500 transition-colors"
              onClick={() => {
                trackEvent({
                  eventType: "share",
                  targetType: "post",
                  targetId: postId,
                });

                setShareOpen(true);
              }}
            aria-label="Share post"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
          <Eye className="h-4 w-4" />
          <span>{formatCount(views)}</span>
        </div>
      </div>

      {shareOpen && currentUserId && (
        <ShareActionModal
          postId={postId}
          currentUserId={currentUserId}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
};

export default memo(PostInteractions);