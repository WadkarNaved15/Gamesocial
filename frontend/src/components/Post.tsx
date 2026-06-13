import React, { Suspense, lazy, useEffect, useRef } from "react";
import type { PostProps } from "../types/Post";
import { hasViewedPost, markPostViewed } from "../utils/viewTracker";
import PostSkeleton from "./Home/PostSkeleton";

const NormalPost = lazy(() => import("./Post/NormalPost"));
const GamePost = lazy(() => import("./Post/GamePost"));
const ExePost = lazy(() => import("./Post/ExePost"));
const DevlogPost = lazy(() => import("./Post/DevlogPost"));
const AdModelPost = lazy(() => import("./Post/AdModelPost"));
const PocketPost = lazy(() => import("./Post/PocketPost"));
const MediaAdPost = lazy(() => import("./Post/MediaAdPost"));

type PostWrapperProps = PostProps & {
  onOpenDetails?: () => void;
  onDeleteSuccess?: (postId: string) => void;
  viewSource?: "feed" | "profile" | "search" | "other";
};

const Fallback = () => <PostSkeleton />;

export const Post: React.FC<PostWrapperProps> = (props) => {
  const { type, _id, viewSource } = props;
  const postRef = useRef<HTMLDivElement | null>(null);
  const watchStartRef = useRef<number | null>(null);
  const watchTimeRef = useRef(0);
  const qualifiedRef = useRef(false);
  const sentRef = useRef(false);


  useEffect(() => {
    const el = postRef.current;
    if (!el) return;

    if (hasViewedPost(_id)) {
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let isVisible = false;


    const BACKEND_URL =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    const sendView = async (watchTimeMs: number) => {
      try {
        await fetch(`${BACKEND_URL}/api/posts/${_id}/view`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "feed",
            deviceType: /Mobi|Android/i.test(navigator.userAgent)
              ? "mobile"
              : "desktop",
            watchTimeMs,
          }),
        });
      } catch {
          // ignore
      }
    };

    const flushView = async () => {
      if (
        sentRef.current ||
        !qualifiedRef.current
      ) {
        return;
      }

      sentRef.current = true;

      const watchTimeMs =
        watchTimeRef.current +
        (watchStartRef.current
          ? Date.now() -
            watchStartRef.current
          : 0);

      await sendView(watchTimeMs);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visibleEnough = entry.isIntersecting && entry.intersectionRatio >= 0.6;

        if(sentRef.current) {
          return;
        }

        if (visibleEnough && document.visibilityState === "visible") {
          if (watchStartRef.current === null) {
            watchStartRef.current = Date.now();
          }
          isVisible = true;

          if (!timer) {
            timer = setTimeout(() => {
              if (!isVisible || document.visibilityState !== "visible") return;
              if (qualifiedRef.current) return;

              if (!qualifiedRef.current) {
                qualifiedRef.current = true;
                markPostViewed(_id);
              }
              timer = null;
            }, 3000);
          }
        } else {
          isVisible = false;
          if (watchStartRef.current !== null) {
            watchTimeRef.current +=
              Date.now() - watchStartRef.current;

            watchStartRef.current = null;
          }
          if (qualifiedRef.current) {
              flushView();
            }

          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      {
        threshold: [0.6],
      }
    );

    observer.observe(el);

    const handleVisibilityChange = () => {
  if (document.visibilityState !== "visible") {

    if (watchStartRef.current) {
      watchTimeRef.current +=
        Date.now() - watchStartRef.current;

      watchStartRef.current = null;
    }
    if (qualifiedRef.current) {
        flushView();
      }

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    isVisible = false;
  }
};

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (watchStartRef.current) {
        watchTimeRef.current +=
          Date.now() - watchStartRef.current;

        watchStartRef.current = null;
      }
      flushView();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timer) clearTimeout(timer);
    };
  }, [_id]);

  const RenderedPost = (() => {
    switch (type) {
      case "game_post":
        return GamePost as React.ComponentType<PostWrapperProps>;
      case "model_post":
        return ExePost as React.ComponentType<PostWrapperProps>;
      case "devlog_post":
        return DevlogPost as React.ComponentType<PostWrapperProps>;
      case "ad_model_post":
        return AdModelPost as React.ComponentType<PostWrapperProps>;
      case "pocket_update":
        return PocketPost as React.ComponentType<PostWrapperProps>;
      case "media_ad_post":
        return MediaAdPost as React.ComponentType<PostWrapperProps>;
      default:
        return NormalPost as React.ComponentType<PostWrapperProps>;
    }
  })();

  return (
    // bg-transparent so the animated Home background bleeds through
    <div ref={postRef} className="bg-transparent">
      <Suspense fallback={<Fallback />}>
        <RenderedPost {...props} />
      </Suspense>
    </div>
  );
};

export default Post;