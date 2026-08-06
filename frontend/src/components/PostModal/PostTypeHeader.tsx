// src/components/postModal/PostTypeHeader.tsx
import React from "react";
import {
  Box,
  Image as ImageIcon,
  Gamepad2,
  Terminal,
  FileText,
  Sparkles,
  LayoutDashboard,
  X,
} from "lucide-react";
import { POST_TYPES, PostType } from "../../types/postTypes";
import { useUser } from "../../context/user";

interface PostTypeHeaderProps {
  active:   PostType;
  onChange: (t: PostType) => void;
  onCancel: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  model:    <Box              size={22} />,
  media:    <ImageIcon        size={22} />,
  game:     <Gamepad2         size={22} />,
  devlog:   <Terminal         size={22} />,
  article:  <FileText         size={22} />,
  ad_model: <Sparkles         size={22} />,
  pocket:   <LayoutDashboard  size={22} />,
};

function getActiveClass(): string {
  return "text-white bg-white/10 dark:bg-white/10 shadow-sm";
}

function getBarClass(): string {
  return "bg-white dark:bg-white";
}

const PostTypeHeader: React.FC<PostTypeHeaderProps> = ({ active, onChange, onCancel }) => {
  const { user, isAdmin } = useUser();

  // Filter out Ad Models completely, and Pocket if the user isn't eligible
  const visibleTypes = POST_TYPES.filter((t) => {
    if (t.id === "ad_model") return false;
    if (t.id === "pocket" && !user?.isPocketEligible) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col items-center w-full mt-10">
      {/* Nav icons */}
      <div className="flex flex-col items-center gap-6 w-full">
        {visibleTypes.map((t) => {
          // ADDED t.id === "game" to the disabled condition
          const isDisabled =
            (t.id === "game") ||
            t.id === "devlog" ||
            t.id === "article";

          return (
            <div
              key={t.id}
              className="group relative flex items-center justify-center w-full px-2"
            >
              <button
                onClick={() => {
                  if (isDisabled) return; 
                  onChange(t.id);
                }}
                disabled={isDisabled}
                className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
                  isDisabled
                    ? "text-gray-500 opacity-40 cursor-not-allowed"
                    : active === t.id
                    ? getActiveClass()
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="relative z-10">
                  {ICON_MAP[t.id]}
                  
                  {/* Red cross for disabled items */}
                  {isDisabled && (
                    <div className="absolute -top-2 -right-2 bg-red-500/10 rounded-full p-0.5">
                      <X size={12} strokeWidth={3} className="text-red-500" />
                    </div>
                  )}
                </div>

                {/* Active indicator bar */}
                <div
                  className={`absolute left-[-8px] w-1 h-6 rounded-r-full transition-all duration-300 ${
                    active === t.id && !isDisabled
                      ? `${getBarClass()} scale-y-100 opacity-100`
                      : "scale-y-0 opacity-0 bg-transparent"
                  }`}
                />
              </button>

              {/* Hover tooltip */}
              <div className="absolute left-full ml-4 flex items-center opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover:translate-x-0 z-50">
                <div className="w-2 h-2 bg-zinc-900 dark:bg-zinc-200 rotate-45 -mr-1" />
                <span className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl">
                  {isDisabled ? `${t.label} (Coming Soon)` : t.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PostTypeHeader;