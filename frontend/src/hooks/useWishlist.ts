import { useState } from "react";
import axios from "axios";
import { usePosts } from "../context/PostContext";
import api from "../utils/api";

export function useWishlist(
  postId: string,
  BACKEND_URL: string
) {
  const { postsById, updatePost } = usePosts();

  const [loading, setLoading] = useState(false);

  const currentPost = postsById[postId];

  const handleWishlist = async () => {
    if (!currentPost || loading) return;

    setLoading(true);

    const previous = currentPost.isWishlisted;

    updatePost(postId, {
      isWishlisted: !previous,
    });

    try {
      if (!previous) {
        await api.post(
          `${BACKEND_URL}/api/wishlist`,
          { postId },
          { withCredentials: true }
        );
      } else {
        await api.delete(
          `${BACKEND_URL}/api/wishlist`,
          {
            data: { postId },
            withCredentials: true,
          }
        );
      }
    } catch (err) {
      console.error(err);

      updatePost(postId, {
        isWishlisted: previous,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isWishlisted: currentPost?.isWishlisted || false,
    handleWishlist,
  };
}