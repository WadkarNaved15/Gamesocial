import React, { useEffect, useRef } from "react";
import SharedPostMessage from "../Home/SharedPostMessage";
import { Message, MediaViewerState } from "./types";

interface MessageBubbleProps {
  msg: Message;
  currentUser: string | undefined;
  isMenuOpen: boolean;
  onToggleMenu: (id: string) => void;
  onDelete: (messageId: string) => void;
  onMediaClick: (media: MediaViewerState) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  currentUser,
  isMenuOpen,
  onToggleMenu,
  onDelete,
  onMediaClick,
}) => {
  const isOwnMessage = msg.senderId === currentUser;
  const isMedia =
    msg.mediaType === "image" || msg.mediaType === "video";

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onToggleMenu((msg._id || msg.tempId) as string);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, [isMenuOpen, onToggleMenu, msg]);

  return (
    <div
      className={`flex ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      <div className="relative group max-w-[85vw] sm:max-w-md md:max-w-lg lg:max-w-xl">
        {isOwnMessage && (msg._id || msg.tempId) && (
          <div
            className="absolute top-1 right-1 z-20"
            ref={menuRef}
          >
            <button
              onClick={() =>
                onToggleMenu((msg._id || msg.tempId) as string)
              }
              className="
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
                text-white/70 hover:text-white
                p-1
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <circle cx="10" cy="4" r="1.5" />
                <circle cx="10" cy="10" r="1.5" />
                <circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                className="
                  absolute right-0 mt-1
                  w-40 rounded-lg
                  bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  shadow-xl overflow-hidden
                "
              >
                <button
                  onClick={() => onDelete(msg._id as string)}
                  className="
                    w-full text-left px-4 py-2
                    text-sm text-red-500
                    hover:bg-red-50
                    dark:hover:bg-red-900/20
                    transition-colors
                  "
                >
                  Delete Message
                </button>
              </div>
            )}
          </div>
        )}

        <div
className={`text-sm flex flex-col ${
  isMedia
    ? ""
    : `py-2.5 px-4 shadow-sm backdrop-blur-md ${
        isOwnMessage 
          ? "bg-white/10 border border-white/10 text-white rounded-2xl rounded-tr-sm" 
          : "bg-gray-800/50 border border-gray-700/50 text-gray-100 rounded-2xl rounded-tl-sm" 
      }`
}`}
        >
          {msg.mediaType === "image" && (
            <div
              className="cursor-pointer overflow-hidden rounded-2xl bg-black/5 dark:bg-black mb-1 w-fit"
              onClick={() =>
                onMediaClick({
                  url: msg.mediaUrl,
                  type: "image",
                })
              }
            >
              <img
                src={msg.mediaUrl}
                crossOrigin="anonymous"
                alt="media"
                loading="lazy"
                className="
                  w-auto h-auto
                  min-w-[200px]
                  max-w-[400px]
                  sm:max-w-[440px]
                  max-h-[320px]
                  object-contain
                  hover:scale-[1.02]
                  transition-transform
                  block
                "
              />
            </div>
          )}

          {msg.mediaType === "video" && (
            <div className="overflow-hidden rounded-2xl bg-black mb-1 w-fit">
              <video
                src={msg.mediaUrl}
                crossOrigin="anonymous"
                controls
                preload="metadata"
                className="
                  w-auto h-auto
                  min-w-[200px]
                  max-w-[400px]
                  sm:max-w-[440px]
                  max-h-[320px]
                  object-contain
                  block
                "
              />
            </div>
          )}

          {msg.text && (
            <p
              className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                isOwnMessage && !isMedia ? "pr-5" : ""
              }`}
            >
              {msg.text}
            </p>
          )}

          {msg.messageType === "post" && (
            <SharedPostMessage
              postId={msg.sharedPostId}
              onOpenPost={(postId: string) => {
                window.open(
                  `/post/${postId}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            />
          )}

          <p
            className={`text-[10px] mt-1 text-right self-end leading-none ${
              isMedia
                ? "text-gray-400"
                : isOwnMessage
                ? "text-gray-300"
                : "text-gray-500"
            }`}
          >
            {new Date(msg.createdAt).toLocaleString(undefined, {
              timeStyle: "short",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;