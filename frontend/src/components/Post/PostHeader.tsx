import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PostProps } from '../../types/Post';
import { toast } from "react-toastify";

interface PostHeaderProps {
  username: string;
  displayName: string;
  timestamp: string;
  type: 'normal_post' | 'model_post' | 'game_post' | 'devlog_post';
  price: number;
  postId: string;
  isOwner?: boolean;
  onDelete?: () => void;
  onProfileClick?: () => void;
}

const PostHeader: React.FC<PostHeaderProps> = ({
  type,
  username,
  displayName,
  timestamp,
  price,
  postId,
  isOwner,
  onDelete,
  onProfileClick,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}/post/${postId}`;

      await navigator.clipboard.writeText(url);

      toast.success("Copied to clipboard", {
        position: "top-right",
        autoClose: 2000,
      });

      setMenuOpen(false);
    } catch (err) {
      console.error("Failed to copy link:", err);

      toast.error("Failed to copy", {
        position: "top-right",
        autoClose: 2000,
      });
    }
  }, [postId]);

  return (
    // mb-3 creates the space between this header and the description below it
    <div className="flex items-center justify-between w-full mb-1">

      {/* LEFT: Identity + Date */}
<div className="flex items-start gap-3">
  <div className="flex flex-col min-w-0">

    {/* Top row */}
    <div className="flex items-center gap-2 flex-wrap">
      <h3
        onClick={(e) => {
          e.stopPropagation();
          onProfileClick?.();
        }}
        className="font-semibold text-white truncate max-w-[160px] sm:max-w-none"
      >
        {displayName || username}
      </h3>

      <span className="text-gray-500">•</span>

      <span className="text-sm text-gray-400 whitespace-nowrap">
        {timestamp}
      </span>
    </div>

    {/* Bottom row */}
    <span
      onClick={(e) => {
        e.stopPropagation();
        onProfileClick?.();
      }}
      className="text-sm text-gray-400 cursor-pointer truncate"
    >
      @{username}
    </span>

  </div>
</div>

      {/* RIGHT: Menu Button */}
      <div className="flex items-center">
        
        {/* MENU BUTTON */}
        <div className="relative" ref={menuRef}>
          <button
            className="
              p-2 rounded-full transition-all duration-200 
              dark:text-gray-400 
              hover:bg-gray-100 dark:hover:bg-gray-800
              hover:text-black dark:hover:text-white
            "
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {menuOpen && (
            <div
              className="
                absolute right-0 mt-2 w-48
                bg-white dark:bg-gray-800
                rounded-xl shadow-lg
                border border-gray-200 dark:border-white/10
                overflow-hidden z-20
              "
            >
              {/* {!isOwner && (
                <button
                  className="
                    block w-full text-left px-4 py-2.5 text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors
                  "
                >
                  Report
                </button>
              )} */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
                className="
                  block w-full text-left px-4 py-2.5 text-sm
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                "
              >
                Copy link
              </button>

              {isOwner && (
                <>
                  <div className="border-t border-gray-200 dark:border-white/10" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete?.();
                    }}
                    className="
                      block w-full text-left px-4 py-2.5 text-sm
                      text-red-500 hover:bg-red-50
                      dark:hover:bg-red-500/10
                      transition-colors
                    "
                  >
                    Delete Post
                  </button>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PostHeader;