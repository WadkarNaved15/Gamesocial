import React, { useEffect, useRef } from "react";
import SharedPostMessage from "../Home/SharedPostMessage";
import { Message, MediaViewerState } from "./types";

interface MessageBubbleProps {
  msg: Message;
  currentUser: string | undefined;
  isMenuOpen: boolean;
  onToggleMenu: (id: string) => void;
  onDelete: (messageId: string) => void;
  onReply: (message: Message) => void;
  onMediaClick: (media: MediaViewerState) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  currentUser,
  isMenuOpen,
  onToggleMenu,
  onDelete,
  onReply,
  onMediaClick,
}) => {
  const isOwnMessage = msg.senderId === currentUser;
  const isMedia = msg.mediaType === "image" || msg.mediaType === "video";

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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, onToggleMenu, msg]);

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div className="relative group max-w-[85vw] sm:max-w-md md:max-w-lg lg:max-w-xl">
        {(msg._id || msg.tempId) && (
          <div className="absolute top-1 right-1 z-30" ref={menuRef}>
            <button
              onClick={() => onToggleMenu((msg._id || msg.tempId) as string)}
              className="
                opacity-0 group-hover:opacity-100 focus:opacity-100
                transition-opacity duration-200
                text-white/70 hover:text-white
                p-1 rounded-full
              "
              aria-label="Message options"
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
                className={`
                  absolute top-full mt-1 w-40 z-50
                  rounded-lg bg-white dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  shadow-xl overflow-hidden
                  ${isOwnMessage ? "right-0" : "left-0 sm:right-auto"}
                `}
              >
                {/* Reply */}
                <button
                  type="button"
                  onClick={() => {
                    onReply(msg);
                    onToggleMenu((msg._id || msg.tempId) as string);
                  }}
                  className="
                    w-full text-left px-4 py-2
                    text-sm text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors
                  "
                >
                  Reply
                </button>

                {/* Delete — only own messages */}
                {isOwnMessage && msg._id && (
                  <button
                    type="button"
                    onClick={() => onDelete(msg._id as string)}
                    className="
                      w-full text-left px-4 py-2
                      text-sm text-red-500
                      hover:bg-red-50 dark:hover:bg-red-900/20
                      transition-colors
                    "
                  >
                    Delete Message
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={`text-sm flex flex-col ${isMedia
            ? ""
            : `py-2.5 px-4 shadow-sm backdrop-blur-md ${isOwnMessage
              ? "bg-white/10 border border-white/10 text-white rounded-2xl rounded-tr-sm"
              : "bg-gray-800/50 border border-gray-700/50 text-gray-100 rounded-2xl rounded-tl-sm"
            }`
            }`}
        >
          {msg.replyTo && (
            <div
              className="
                mb-2 rounded-lg border-l-2
                border-white/40 bg-black/10 dark:bg-black/20
                px-3 py-2 overflow-hidden
              "
            >
              <p className="text-[11px] font-semibold text-white/70 mb-0.5">
                {msg.replyTo.senderId === currentUser ? "You" : "Reply"}
              </p>

              {msg.replyTo.mediaType === "image" && (
                msg.replyTo.mediaUrl ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={msg.replyTo.mediaUrl}
                      alt="Replied image"
                      crossOrigin="anonymous"
                      className="w-12 h-12 rounded-md object-cover shrink-0 bg-black"
                    />

                    <p className="text-xs text-gray-300 truncate">
                      Photo
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 truncate">
                    📷 Photo
                  </p>
                )
              )}

              {msg.replyTo.mediaType === "video" && (
                msg.replyTo.mediaUrl ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-md bg-black">
                      <video
                        src={msg.replyTo.mediaUrl}
                        crossOrigin="anonymous"
                        preload="metadata"
                        muted
                        className="
            w-full h-full
            object-cover
            pointer-events-none
          "
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="text-white text-sm">
                          ▶
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 truncate">
                      Video
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 truncate">
                    🎥 Video
                  </p>
                )
              )}

              {msg.replyTo.messageType === "post" && (
                <p className="text-xs text-gray-300 truncate">Shared post</p>
              )}

              {msg.replyTo.text && (
                <p className="text-xs text-gray-300 whitespace-pre-wrap break-words [overflow-wrap:anywhere] line-clamp-3">
                  {msg.replyTo.text}
                </p>
              )}

              {!msg.replyTo.text &&
                !msg.replyTo.mediaType &&
                msg.replyTo.messageType !== "post" && (
                  <p className="text-xs text-gray-400 italic">Message</p>
                )}
            </div>
          )}

          {msg.mediaType === "image" && (
            <div
              className="cursor-pointer overflow-hidden rounded-2xl bg-black/5 dark:bg-black mb-1 w-fit"
              onClick={() =>
                onMediaClick({
                  url: msg.mediaUrl || "",
                  type: "image",
                })
              }
            >
              <img
                src={msg.mediaUrl || undefined}
                crossOrigin="anonymous"
                alt="media"
                loading="lazy"
                className="
                  w-auto h-auto
                  min-w-[200px] max-w-[400px] sm:max-w-[440px]
                  max-h-[320px] object-contain
                  hover:scale-[1.02] transition-transform block
                "
              />
            </div>
          )}

          {msg.mediaType === "video" && (
            <div className="overflow-hidden rounded-2xl bg-black mb-1 w-fit">
              <video
                src={msg.mediaUrl || undefined}
                crossOrigin="anonymous"
                controls
                preload="metadata"
                className="
                  w-auto h-auto
                  min-w-[200px] max-w-[400px] sm:max-w-[440px]
                  max-h-[320px] object-contain block
                "
              />
            </div>
          )}

          {msg.text && (
            <p
              className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] pr-6`}
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
            className={`text-[10px] mt-1 text-right self-end leading-none ${isMedia
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