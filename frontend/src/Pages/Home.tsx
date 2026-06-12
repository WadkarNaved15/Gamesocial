// src/pages/Home.tsx
import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useFeed } from "../context/FeedContext";
import Post from "../components/Post";
import PostSkeleton from "../components/Home/PostSkeleton";
import type { PostProps } from "../types/Post";
import CircleLoader from "../components/Loader/CircleLoader";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackEvent } from "../utils/analytics";
import api from "../utils/api";

function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const isSearch = query.length > 0;
  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const {
    posts: mainPosts,
    setPosts: setMainPosts,
    nextCursor,
    setNextCursor,
    hasMore,
    setHasMore,
  } = useFeed();

  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [filteredPosts, setFilteredPosts] = useState<PostProps[]>([]);
  const [searchExecuted, setSearchExecuted] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [searchHasMore, setSearchHasMore] = useState(true);

  // ── Fetch Main Feed ──────────────────────────────────────────────────────
  const fetchMainPosts = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;
      setLoading(true);

      try {
        const res = await api.get(
          "/api/posts/fetch_posts",
          {
            params: {
              cursor: reset ? null : nextCursor,
              limit: 5,
            },
          }
        );
        const newPosts = res.data.posts;
        const newCursor = res.data.nextCursor;

        setMainPosts((prev) => {
          const all: PostProps[] = reset ? newPosts : [...prev, ...newPosts];
          const uniquePosts: PostProps[] = Array.from(
            new Map<string, PostProps>(
              all.map((p: PostProps) => [p._id, p])
            ).values()
          );
          return uniquePosts;
        });

        setNextCursor(newCursor);
        if (!newCursor || newPosts.length === 0) {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [nextCursor, loading, hasMore, BACKEND_URL]
  );
  const fetchRef = useRef(fetchMainPosts);

  useEffect(() => {
    fetchRef.current = fetchMainPosts;
  }, [fetchMainPosts]);

  // ── Fetch Filtered Posts ─────────────────────────────────────────────────
  const fetchFilteredPosts = useCallback(
    async (query: string, reset = false) => {
      if (!query.trim()) return;
      if (searchLoading) return;
      if (!reset && !searchHasMore) return;

      setSearchLoading(true);
      setSearchExecuted(true);

      try {
        const res = await api.get(
          "/api/posts/filter_posts",
          {
            params: {
              query,
              cursor: reset ? null : searchCursor,
              limit: 5,
            },
          }
        );

        const newPosts = res.data.posts;
        const newCursor = res.data.nextCursor;
        setFilteredPosts((prev: PostProps[]) => {
          const all: PostProps[] = reset ? newPosts : [...prev, ...newPosts];

          const uniquePosts: PostProps[] = Array.from(
            new Map<string, PostProps>(
              all.map((p: PostProps) => [p._id, p])
            ).values()
          );

          return uniquePosts;
        });

        setSearchCursor(newCursor);

        if (!newCursor) {
          setSearchHasMore(false);
        }
      } catch (err) {
        console.error("Failed to fetch filtered posts:", err);
      } finally {
        setSearchLoading(false);
      }
    },
    [searchCursor, searchHasMore, BACKEND_URL]
  );

  // ── Initial Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mainPosts.length === 0 && !isSearch) {
      fetchMainPosts(true);
    }
  }, [mainPosts.length, isSearch]);

  // ── Search Trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!query) {
      setFilteredPosts([]);
      setSearchExecuted(false);
      return;
    }

    trackEvent({
      eventType: "search",
      metadata: {
        query,
      },
    });

    setFilteredPosts([]);
    setSearchCursor(null);
    setSearchHasMore(true);

    fetchFilteredPosts(query, true);
  }, [query]);

  // ── Infinite Scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isSearch ? !searchHasMore : !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

        if (isSearch) {
          fetchFilteredPosts(query);
        } else {
          fetchRef.current();
        }
      },
      { rootMargin: "1200px" }
    );

    const loader = loaderRef.current;

    if (loader) observer.observe(loader);

    return () => observer.disconnect();
  }, [hasMore, searchHasMore, isSearch, query, fetchFilteredPosts]);

  useEffect(() => {
    if (isSearch) return;

    trackEvent({
      eventType: "page_view",
      targetType: "page",
      metadata: {
        page: "home_feed",
      },
    });
  }, []);

  function trackPostOpen({
    postId,
    postType,
    viewSource = "feed",
  }: {
    postId: string;
    postType:
      | "normal_post"
      | "model_post"
      | "game_post"
      | "canvas_article"
      | "devlog_post"
      | "ad_model_post"
      | "media_ad_post"
      | "pocket_update";
    viewSource?: string;
  }) {
    trackEvent({
      eventType: "content_view",
      targetType: postType,
      targetId: postId,
      metadata: {
        source: viewSource,
        page: window.location.pathname,
      },
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    /*
     * LAYERED BACKGROUND SYSTEM
     * Layer 0 (outermost): fixed animated gradient orbs — these are the
     *   colours that bleed through the transparent posts above them.
     * Layer 1: the scrollable feed sits on top with bg-transparent so
     *   everything below is visible.
     *
     * To add your own colours/animations, edit the orb divs below.
     * The orbs use CSS keyframe animations injected via a <style> tag.
     */
    <div className="relative flex flex-col items-center min-h-[80vh] w-full">

      {/* ── Animated background — fixed, behind everything ── */}
      <style>{`
        @keyframes orb-drift-1 {
          0%   { transform: translate(0px,    0px)    scale(1);    }
          33%  { transform: translate(60px,  -40px)   scale(1.08); }
          66%  { transform: translate(-30px,  50px)   scale(0.95); }
          100% { transform: translate(0px,    0px)    scale(1);    }
        }
        @keyframes orb-drift-2 {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          40%  { transform: translate(-50px, 70px)   scale(1.1);  }
          75%  { transform: translate(40px, -30px)   scale(0.92); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
        @keyframes orb-drift-3 {
          0%   { transform: translate(0px,  0px)   scale(1);    }
          50%  { transform: translate(30px, 60px)   scale(1.05); }
          100% { transform: translate(0px,  0px)   scale(1);    }
        }
        @keyframes orb-drift-4 {
          0%   { transform: translate(0px,   0px)   scale(1);    }
          45%  { transform: translate(-60px,-50px)   scale(1.12); }
          100% { transform: translate(0px,   0px)   scale(1);    }
        }
      `}</style>

      {/*
       * Fixed orb layer — position:fixed so it never scrolls away.
       * pointer-events:none so it doesn't intercept clicks.
       * z-index:-1 keeps it behind the feed content.
       */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        {/* Teal orb — top-left */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: "55vw",
            height: "55vw",
            maxWidth: 700,
            maxHeight: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(61,122,110,0.28) 0%, transparent 70%)",
            animation: "orb-drift-1 18s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Purple orb — top-right */}
        <div
          style={{
            position: "absolute",
            top: "5%",
            right: "-10%",
            width: "45vw",
            height: "45vw",
            maxWidth: 580,
            maxHeight: 580,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(100,60,180,0.20) 0%, transparent 70%)",
            animation: "orb-drift-2 22s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Deep blue orb — mid-screen */}
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "20%",
            width: "40vw",
            height: "40vw",
            maxWidth: 500,
            maxHeight: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(30,80,160,0.15) 0%, transparent 70%)",
            animation: "orb-drift-3 26s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Teal/cyan accent orb — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: "-5%",
            right: "5%",
            width: "38vw",
            height: "38vw",
            maxWidth: 480,
            maxHeight: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,180,150,0.16) 0%, transparent 70%)",
            animation: "orb-drift-4 20s ease-in-out infinite",
            filter: "blur(2px)",
          }}
        />
        {/* Subtle warm accent — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "-8%",
            width: "30vw",
            height: "30vw",
            maxWidth: 380,
            maxHeight: 380,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(120,60,200,0.12) 0%, transparent 70%)",
            animation: "orb-drift-1 30s ease-in-out infinite reverse",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* ── Feed content — sits above bg layer, posts are transparent ── */}
      <div className="relative w-full" style={{ zIndex: 1 }}>

        {/* SEARCH FEED */}
        {isSearch ? (
          <div className="w-full mt-4 flex flex-col md:px-0 px-0">
            <button
              onClick={() => {
                navigate("/");
              }}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"
            >
              <ArrowLeft size={20} />
              Back to Feed
            </button>

            {searchLoading && <CircleLoader />}

            {!searchLoading && searchExecuted && filteredPosts.length === 0 && (
              <div className="text-gray-400 mt-4">
                No posts found for "{query}"
              </div>
            )}

            {filteredPosts.map((post) => (
              <Post
                key={post._id}
                {...post}
                viewSource="search"
                onOpenDetails={() => {
                  trackEvent({
                    eventType: "search_click",
                    targetType: post.type,
                    targetId: post._id,
                    metadata: { query },
                  });

                  trackPostOpen({
                    postId: post._id,
                    postType: post.type,
                    viewSource: "search",
                  });

                  navigate(`/post/${post._id}`, {
                    state: { post },
                  });
                }}
              />
            ))}

            <div ref={loaderRef} className="h-10 w-full" />
          </div>
        ) : (
          <>
            {/* MAIN FEED */}
            {mainPosts.length > 0 && (
              <div className="w-full mt-4 flex flex-col">
                {mainPosts.map((post) => (
                  <Post
                    key={post._id}
                    {...post}
                    viewSource="feed"
                    onOpenDetails={() => {
                      trackPostOpen({
                        postId: post._id,
                        postType: post.type,
                        viewSource: "feed",
                      });

                      navigate(`/post/${post._id}`, {
                        state: { post },
                      });
                    }}
                  />
                ))}
              </div>
            )}

            {loading && mainPosts.length === 0 && (
              <div className="w-full mt-4 flex flex-col">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            )}

            {!hasMore && mainPosts.length > 0 && (
              <div className="text-gray-500 mt-4 text-center text-sm pb-8">
                You've reached the end.
              </div>
            )}

            <div ref={loaderRef} className="h-10 w-full" />
          </>
        )}
      </div>
    </div>
  );
}

export default Home;