import React, { Suspense, lazy } from "react";
import type { PostProps } from "../types/Post"; 

// Lazy load post components
const NormalPost = lazy(() => import("./Post/NormalPost"));
const GamePost = lazy(() => import("./Post/GamePost"));
const ExePost = lazy(() => import("./Post/ExePost"));


// Small fallback component for suspense
const Fallback = () => (
  <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
);

export const Post: React.FC<PostProps> = (props) => {
  const { type } = props;

const RenderedPost = (() => {
  switch (type) {
    case "game_post":
      return GamePost as React.ComponentType<PostProps>;
    case "exe_post":
      return ExePost as React.ComponentType<PostProps>;
    default:
      return NormalPost as React.ComponentType<PostProps>;
  }
})();

  return (
    <Suspense fallback={<Fallback />}>
      <RenderedPost {...props} />
    </Suspense>
  );
};

export default Post;
