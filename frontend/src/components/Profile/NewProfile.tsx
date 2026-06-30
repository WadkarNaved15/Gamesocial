// src/pages/ProfilePage.tsx
import React from "react";
import { Youtube, Instagram, MessageSquare } from "lucide-react";
import FollowButton from "../FollowButton";
import type { ArticleProps } from "../../types/Article";
import FollowersList from "../FollowersList";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useScrollRestoration } from "../../hooks/useScrollRestoration";
import { saveProfileCache, getProfileCache, clearProfileCache } from "../../utils/profileCache";
import type { ProfileUser } from "../../utils/profileCache";
import Post from "../Post";
import { useChat } from "../../context/ChatContext";
import { usePosts } from "../../context/PostContext";
import EditProfileModal from "./EditProfileModal";
import type { PostProps } from "../../types/Post";
import { useUser } from "../../context/user";
import { trackEvent } from "../../utils/analytics";
import api from "../../utils/api";
import ProfileNotFound from "../../Pages/ErrorHandling/ProfileNotFound";

// Shared glass card style used across all panels
const glassCard =
  "bg-transparent backdrop-blur-md border border-white/10 rounded-3xl";

const ProfilePage: React.FC = () => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const { username } = useParams<{ username: string }>();
  const { user } = useUser();
  const { addPosts } = usePosts();
  const navigate = useNavigate();
  const { openChatWith } = useChat();

  const cachedRef = useRef(username ? getProfileCache(username) : null);
  const cached = cachedRef.current;

  const [profileUser, setProfileUser] = useState<ProfileUser | null>(cached?.profileUser ?? null);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [userPosts, setUserPosts] = useState<PostProps[]>(cached?.posts ?? []);
  const [cursor, setCursor] = useState<string | null>(cached?.cursor ?? null);
  const [hasMorePosts, setHasMorePosts] = useState(cached?.hasMore ?? true);
  const [userArticles, setUserArticles] = useState<ArticleProps[]>(cached?.articles ?? []);
  const [loadingProfile, setLoadingProfile] = useState(!cached);
  const [loadingPosts, setLoadingPosts] = useState(!cached);
  const [loadingArticles, setLoadingArticles] = useState(!cached);
  const [editOpen, setEditOpen] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
  const activeFetchIdRef = useRef<string | null>(null);
  const activeArticleFetchIdRef = useRef<string | null>(null);
  const isOwnProfile = user?._id === profileUser?._id;

  const contentReady = !loadingProfile && userPosts.length > 0;
  const savedScrollY = cached?.scrollY ?? 0;

  useScrollRestoration(`profile_${username}`, savedScrollY, contentReady);

  // ── Save to cache on unmount ──────────────────────────────────────────────
  const stateRef = useRef({ userPosts, cursor, hasMorePosts, userArticles, profileUser });
  const usernameRef = useRef(username);

  useEffect(() => {
    stateRef.current = { userPosts, cursor, hasMorePosts, userArticles, profileUser };
    usernameRef.current = username;
  });

  useEffect(() => {
    return () => {
      const u = usernameRef.current;
      if (!u || !stateRef.current.profileUser) return;
      saveProfileCache(u, {
        profileUser: stateRef.current.profileUser,
        posts: stateRef.current.userPosts,
        cursor: stateRef.current.cursor,
        hasMore: stateRef.current.hasMorePosts,
        articles: stateRef.current.userArticles,
        scrollY: window.scrollY,
      });
    };
  }, []);

  // ── Fetch profile ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      try {
        const res = await api.get(`/api/users/username/${username}`);
        if (usernameRef.current !== username) return;
        setProfileUser(res.data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setProfileNotFound(true);
        }
        console.error("Failed to load profile", err);
      } finally {
        if (usernameRef.current === username) setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [username]);

  // ── Fetch posts ──────────────────────────────────────────────────────────
  const fetchPosts = async (cursorParam: string | null = null) => {
    if (!profileUser?._id) return;
    if (!hasMorePosts && cursorParam !== null) return;

    const fetchId = profileUser._id;
    activeFetchIdRef.current = fetchId;
    setLoadingPosts(true);

    try {
      const res = await api.get(`/api/posts/user_posts/${fetchId}`, {
        params: { cursor: cursorParam, limit: 10 },
      });
      addPosts(res.data.posts);
      if (activeFetchIdRef.current !== fetchId) return;
      setUserPosts((prev) =>
        cursorParam === null ? res.data.posts : [...prev, ...res.data.posts]
      );
      setCursor(res.data.nextCursor);
      if (!res.data.nextCursor) setHasMorePosts(false);
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      if (activeFetchIdRef.current === fetchId) setLoadingPosts(false);
    }
  };

  // ── Fetch posts on profile load ───────────────────────────────────────────
  useEffect(() => {
    if (!profileUser?._id) return;
    trackEvent({
      eventType: "profile_page_view",
      targetType: "user",
      targetId: profileUser._id,
    });
    if (cachedRef.current?.posts?.length) return;
    fetchPosts(null);
  }, [profileUser?._id]);

  // ── Fetch articles on profile load ───────────────────────────────────────
  useEffect(() => {
    if (!profileUser?._id) return;
    if (cachedRef.current?.articles?.length) return;

    const fetchId = profileUser._id;
    activeArticleFetchIdRef.current = fetchId;

    const fetchArticles = async () => {
      try {
        const res = await api.get(`/api/articles/published/user/${fetchId}`);
        if (activeArticleFetchIdRef.current !== fetchId) return;
        setUserArticles(res.data);
      } catch (err) {
        console.error("Failed to load articles", err);
      } finally {
        if (activeArticleFetchIdRef.current === fetchId) setLoadingArticles(false);
      }
    };

    fetchArticles();
  }, [profileUser?._id, BACKEND_URL]);

  // ── Infinite scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadMoreRef.current || !profileUser?._id) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMorePosts && !loadingPosts && !fetchingRef.current) {
          fetchingRef.current = true;
          fetchPosts(cursor).finally(() => {
            fetchingRef.current = false;
          });
        }
      },
      { root: null, rootMargin: "600px", threshold: 0 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [cursor, hasMorePosts, loadingPosts, profileUser?._id]);

  if (loadingProfile && !profileUser) {
    return <div className="p-10 text-white/50">Loading profile...</div>;
  }

  if (profileNotFound) {
    return <ProfileNotFound />;
  }

  return (
    <div className="relative min-h-screen text-white">

      {/* Max-width wrapper */}
      <div className="max-w-6xl">

        {/* ── Header: Username + Actions + Followers ── */}
        <div className="w-full pb-6 pt-4 ">
          <div className="grid grid-cols-[1fr_auto] items-end gap-6">
            <div className="flex flex-col">
              {/* Name row */}
              <div className="flex items-center gap-5 flex-wrap">
                <h1 className="text-4xl font-black tracking-tight text-white italic uppercase leading-none">
                  {profileUser?.username}
                </h1>

                {isOwnProfile ? (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/15 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-sm transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <FollowButton
                      targetId={profileUser ? profileUser._id : ""}
                      initialFollowing={profileUser?.isFollowing ?? false}
                    />
                    <button
                      onClick={() =>
                        openChatWith({
                          id: profileUser!._id,
                          name: profileUser!.username,
                          avatar: profileUser!.avatar ?? "./default-avatar.png",
                        })
                      }
                      className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-sm transition-all active:scale-95"
                    >
                      <MessageSquare size={16} strokeWidth={3} />
                      <span>Chat</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Handle */}
              <p className="text-sm font-bold text-white/40 mt-1.5 lowercase">
                @{profileUser?.username?.replace(/\s+/g, "") || "johndeveloper"}
              </p>

              {editOpen && (
                <EditProfileModal
                  onClose={() => setEditOpen(false)}
                  onSaved={() => {
                    if (username) clearProfileCache(username);
                    cachedRef.current = null;
                    setEditOpen(false);
                  }}
                />
              )}
            </div>

            <div className="shrink-0 mb-3">
              <FollowersList userId={profileUser ? profileUser._id : ""} />
            </div>
          </div>
        </div>

        {/* ── Profile Hero ── */}
        <div className="max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 ">

            {/* LEFT: Profile Card */}
            <div className="flex-1 pt-0 bg-white/[0.03] rounded-3xl">
              <div className={`${glassCard} relative overflow-hidden h-full min-h-[350px] flex flex-col`}>

                {/* Banner */}
                <div className="relative h-32 md:h-40 shrink-0 overflow-hidden rounded-t-3xl">
                  <img
                    src={
                      profileUser?.banner ||
                      "https://fastly.picsum.photos/id/299/800/200.jpg?hmac=xMdRbjiNM_IogJDEgKIJ0GeCxZ8nwOGd5_Wf_ODZ94s"
                    }
                    className="w-full h-full object-cover"
                    alt="Cover"
                  />
                  {/* Fade into glass below */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40" />
                </div>

                {/* Avatar + bio overlap */}
                <div className="relative px-8 -mt-14 md:-mt-20 flex flex-col items-center text-center md:flex-row md:items-end md:text-left gap-6 z-10">
                  <div className="relative group shrink-0">
                    <img
                      src={profileUser?.avatar || "/default_avatar.png"}
                      className="relative w-24 h-24 md:w-36 md:h-36 rounded-full object-cover border-4 md:border-[6px] border-white/20 shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer"
                      alt="Avatar"
                    />
                  </div>

                  {/* Tagline */}
                  <div className="md:mb-4">
                    <p className="text-white/50 font-medium text-xs md:text-sm leading-relaxed max-w-sm">
                      With an{" "}
                      <span className="text-white font-bold">authoritative voice</span> and
                      calm demeanor...
                    </p>
                  </div>
                </div>

                {/* Bio body */}
                <div className="p-8 flex-grow">
                  <p className="text-white/40 text-sm leading-relaxed">
                    {profileUser?.bio || "Additional profile content or bio details can go here."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mt-6 pb-112">
          <div className="min-w-0 flex flex-col">
            {loadingPosts && (
              <div className="text-white/40 text-sm">Loading your posts...</div>
            )}

            {!loadingPosts && userPosts.length === 0 && (
              <div className="text-white/40 text-sm">
                You haven't uploaded any posts yet.
              </div>
            )}

            <div className="flex flex-col">
              {userPosts.map((post) => (
                <Post
                  key={post._id}
                  {...post}
                  viewSource="profile"
                  onDeleteSuccess={(postId) => {
                    setUserPosts((prev) => prev.filter((p) => p._id !== postId));
                  }}
                  onOpenDetails={() => {
                    trackEvent({
                      eventType: "content_view",
                      targetType: post.type,
                      targetId: post._id,
                      metadata: {
                        source: "profile",
                        profileOwnerId: profileUser?._id,
                      },
                    });
                    navigate(`/post/${post._id}`, { state: { post } });
                  }}
                />
              ))}

              {hasMorePosts && (
                <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                  <span className="text-xs text-white/30">Loading more posts...</span>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default ProfilePage;