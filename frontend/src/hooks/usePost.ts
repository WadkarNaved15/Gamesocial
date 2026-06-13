import { usePosts } from "../context/PostContext";

export function usePost(postId: string) {
  const { postsById } = usePosts();

  return postsById[postId];
}