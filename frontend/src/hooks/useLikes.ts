import { useState } from "react";
import axios from "axios";
import { usePosts } from "../context/PostContext";

export function useLikes(
  postId: string,
  BACKEND_URL: string
) {
  const { postsById, updatePost } = usePosts();

  const [loading, setLoading] = useState(false);

  const currentPost = postsById[postId];
  const handleLike = async () => {
    if (!currentPost || loading) return;

    setLoading(true);

    const previousLiked = currentPost.isLiked;

    updatePost(postId, {
      isLiked: !previousLiked,
      likesCount: previousLiked
        ? (currentPost.likesCount ?? 0) - 1
        : (currentPost.likesCount ?? 0) + 1,
    });

    try {
      if (!previousLiked) {
        await axios.post(
          `${BACKEND_URL}/api/likes`,
          { postId },
          { withCredentials: true }
        );
      } else {
        await axios.delete(
          `${BACKEND_URL}/api/likes`,
          {
            data: { postId },
            withCredentials: true,
          }
        );
      }
    } catch (err) {
      // Check if it's an Axios error and has a response from the server
      if (axios.isAxiosError(err) && err.response) {
        console.error("Backend Error Response:", err.response.data);
      } else {
        console.error("An unexpected error occurred:", err);
      }

      // Your existing rollback state logic
      updatePost(postId, {
        isLiked: previousLiked,
        likesCount: currentPost.likesCount,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    likesCount: currentPost?.likesCount || 0,
    isLiked: currentPost?.isLiked || false,
    handleLike,
  };
}