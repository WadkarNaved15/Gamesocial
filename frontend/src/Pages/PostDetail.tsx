import {
  X, UserPlus, Box, Maximize2,
  Paintbrush, Activity
} from "lucide-react";
import { ExePostProps } from "../types/Post";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CommentSection from "../components/Post/CommentSection";
import FollowButton from "../components/FollowButton";
import { useState, useEffect } from "react";
import "@google/model-viewer";

const PostDetail = ({ post: initialPost, onClose }: { post: ExePostProps; onClose: () => void }) => {
  const [post, setPost] = useState<ExePostProps>(initialPost);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const [activeIndex, setActiveIndex] = useState(0);

  // 🔹 fetch full model post
  useEffect(() => {
    const fetchFullPost = async () => {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/api/posts/${initialPost._id}`,
          { withCredentials: true }
        );

        setPost(res.data);
      } catch (err) {
        console.error("Failed to fetch full model post:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFullPost();
  }, [initialPost._id]);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-40">
        <div className="text-gray-400 text-sm">Loading 3D Model...</div>
      </div>
    );
  }


  const assets = post.modelPost?.assets ?? [];
  const title = post.modelPost?.title;
  const activeAsset = assets[activeIndex];
  const meta = activeAsset?.metadata;
  const modelUrl =
    activeAsset?.optimization?.status === "completed"
      ? activeAsset.optimizedUrl
      : activeAsset?.originalUrl;
  const avatarUrl = "/default_avatar.png";

  return (
    <>
      <div className="w-full flex justify-center">
        <div
          className="
            w-full max-w-7xl 
            h-auto 
            bg-white text-black
            dark:bg-[#191919] dark:text-white
            overflow-visible
          "
        >
          {/* HEADER */}
          <div
            className="
              sticky top-0 z-30
              w-full
              border-b
              bg-white text-black
              dark:bg-[#191919] dark:text-white
              border-gray-200 dark:border-gray-800
              px-6 py-4
            "
          >
            <div className="flex items-center justify-between w-full">
              {/* LEFT: Username + Date */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={post.user.avatar || avatarUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${post.user.username}`);
                      }}
                      alt={post.user.username}
                      className="h-full w-full object-cover cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col mx-2">
                    <h3
                      className="font-semibold text-gray-900 dark:text-white cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${post.user.username}`);
                      }}
                    >
                      {post.user.displayName}
                    </h3>
                    <h4
                      className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${post.user.username}`);
                      }}
                    >
                      @{post.user.username.replace(/\s+/g, "")}
                    </h4>
                  </div>
                 <FollowButton targetId={post.user._id} initialFollowing={post.user.isFollowing || false} />
                </div>
              </div>

              {/* RIGHT: Close */}
              <div className="flex items-center gap-2">
                {/* CLOSE BUTTON */}
                <button
                  onClick={onClose}
                  className="
                    p-2 rounded-full
                    transition-all duration-200
                    text-gray-500
                    hover:text-black dark:hover:text-white
                    hover:bg-[#191919]/5 dark:hover:bg-white/10
                  "
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN HORIZONTAL LAYOUT */}
          <div className="px-6 pb-4 pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT CONTENT — TITLE & DESCRIPTION */}
              <aside className="col-span-1 lg:col-span-3 flex flex-col gap-8">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                      {title ?? "Untitled 3D Model"}
                    </h2>
                    <div className="mt-4 prose prose-sm dark:prose-invert">
                      <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                        {post.description || "No description provided for this high-quality 3D asset."}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>

              {/* CENTER — ENHANCED 3D MODEL VIEWER */}
              <main className="col-span-1 lg:col-span-6 flex flex-col items-center">
                {/* The Container */}
                <div className="relative w-full h-[580px] rounded-2xl overflow-hidden bg-gradient-to-b from-gray-50 to-gray-200 dark:from-neutral-900 dark:to-black border border-gray-200 dark:border-gray-800 shadow-2xl">
                  {/* @ts-ignore */}
                  <model-viewer
                    src={modelUrl}
                    alt="3D model"
                    auto-rotate
                    camera-controls
                    shadow-intensity="2"
                    shadow-softness="1"
                    exposure="1.2"
                    environment-image="neutral"
                    loading="eager"
                    style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
                  >
                    {/* @ts-ignore */}
                  </model-viewer>

                  {/* Asset Selection Logic */}
                  {assets.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl bg-white/70 dark:bg-[#191919]/70 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl flex gap-3 z-10">
                      {assets.map((asset, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveIndex(idx)}
                          className={`group relative flex flex-col items-center transition-all duration-300 ${
                            idx === activeIndex ? "scale-110" : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          {/* Asset Icons */}
                          <div
                            className={`
                              w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all
                              ${
                                idx === activeIndex
                                  ? "border-gray-900 dark:border-white bg-gray-200 dark:bg-white/20 shadow-sm"
                                  : "border-transparent bg-gray-100 dark:bg-white/5"
                              }
                            `}
                          >
                            <Box
                              className={`w-6 h-6 ${
                                idx === activeIndex ? "text-gray-900 dark:text-white" : "text-gray-500"
                              }`}
                            />
                          </div>

                          {/* Miniature Label */}
                          <span
                            className={`text-[10px] mt-1 font-bold uppercase tracking-tighter ${
                              idx === activeIndex ? "text-gray-900 dark:text-white" : "text-gray-400"
                            }`}
                          >
                            {asset.name.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </main>

              {/* RIGHT CONTENT - SPECS */}
              <aside className="col-span-1 lg:col-span-3 space-y-8 text-sm">
                {/* TECHNICAL SPECIFICATIONS GROUP */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {/* Geometry Info */}
                    <div className="group p-4 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 transition-all hover:border-gray-300 dark:hover:border-gray-600">
                      <div className="flex items-center gap-3 mb-3">
                        <Maximize2 className="w-4 h-4 text-gray-900 dark:text-white" />
                        <span className="font-semibold text-gray-900 dark:text-white">Geometry</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Meshes</p>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">{meta?.geometry?.meshes ?? "N/A"}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Vertices</p>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">{meta?.geometry?.vertices?.toLocaleString() ?? "N/A"}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Triangles</p>
                          <p className="font-mono font-medium text-gray-900 dark:text-white">{meta?.geometry?.triangles?.toLocaleString() ?? "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Surface & Materials */}
                    <div className="group p-4 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 transition-all hover:border-gray-300 dark:hover:border-gray-600">
                      <div className="flex items-center gap-3 mb-3">
                        <Paintbrush className="w-4 h-4 text-gray-900 dark:text-white" />
                        <span className="font-semibold text-gray-900 dark:text-white">Surface</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Materials</p>
                          <p className="font-medium text-gray-900 dark:text-white">{meta?.materials}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Textures</p>
                          <p className={`font-medium ${meta?.textures.present ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                            {meta?.textures.present ? "Included" : "None"}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">UV Layers</p>
                          <p className="font-medium text-gray-900 dark:text-white">{meta?.uvLayers}</p>
                        </div>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="group p-4 rounded-xl border border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 transition-all hover:border-gray-300 dark:hover:border-gray-600">
                      <div className="flex items-center gap-3 mb-3">
                        <Activity className="w-4 h-4 text-gray-900 dark:text-white" />
                        <span className="font-semibold text-gray-900 dark:text-white">Capabilities</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Rigged</p>
                          <p className="font-medium text-gray-900 dark:text-white">{meta?.rigged ? "Ready" : "No"}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-gray-500 dark:text-gray-400">Animations</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              meta?.animations.present
                                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                                : "bg-gray-100 dark:bg-neutral-800 text-gray-400"
                            }`}
                          >
                            {meta?.animations.present ? `${meta.animations.count} Sequences` : "Static"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* COMMENTS SECTION - Aligned with the layout */}
      <div className="w-full max-w-7xl px-6 pb-20 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12  gap-8">
          <div className="col-span-1 lg:col-span-12">
            <CommentSection postId={post._id} BACKEND_URL={BACKEND_URL} postOwnerId={post.user?._id} />
          </div>
        </div>
      </div>
    </>
  );
};

export default PostDetail;