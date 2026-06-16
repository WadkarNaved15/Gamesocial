// src/components/postModal/PostTypeHeader.tsx
import React from "react";
import {
  Box,
  Image as ImageIcon,
  Gamepad2,
  Terminal,
  FileText,
  Sparkles,
  LayoutDashboard, // pocket icon
} from "lucide-react";
import { POST_TYPES, PostType } from "../../types/postTypes";

interface PostTypeHeaderProps {
  active:   PostType;
  onChange: (t: PostType) => void;
  onCancel: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  model:   <Box             size={22} />,
  media:   <ImageIcon       size={22} />,
  game:    <Gamepad2        size={22} />,
  devlog:  <Terminal        size={22} />,
  article: <FileText        size={22} />,
  ad_model: <Sparkles        size={22} />,
  pocket:  <LayoutDashboard size={22} />,
};

// Unified brand colour for active state across all types
function getActiveClass(): string {
  return "text-[#3D7A6E] bg-[#3D7A6E]/10 dark:bg-[#3D7A6E]/10 shadow-sm";
}

function getBarClass(): string {
  return "bg-[#3D7A6E]";
}

const PostTypeHeader: React.FC<PostTypeHeaderProps> = ({ active, onChange, onCancel }) => {
  return (
    <div className="h-full flex flex-col items-center w-full">

      {/* Nav icons */}
      <div className="flex flex-col items-center gap-6 w-full">
        {POST_TYPES.map((t) => (
          <div
            key={t.id}
            className="group relative flex items-center justify-center w-full px-2"
          >
            <button
              onClick={() => onChange(t.id)}
              className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 ${
                active === t.id
                  ? getActiveClass()
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900"
              }`}
            >
              <div className="relative z-10">{ICON_MAP[t.id]}</div>

              {/* Active indicator bar */}
              <div
                className={`absolute left-[-8px] w-1 h-6 rounded-r-full transition-all duration-300 ${
                  active === t.id
                    ? `${getBarClass()} scale-y-100 opacity-100`
                    : "scale-y-0 opacity-0 bg-transparent"
                }`}
              />
            </button>

            {/* Hover tooltip */}
            <div className="absolute left-full ml-4 flex items-center opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover:translate-x-0 z-50">
              <div className="w-2 h-2 bg-zinc-900 dark:bg-zinc-200 rotate-45 -mr-1" />
              <span className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[11px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl">
                {t.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostTypeHeader;