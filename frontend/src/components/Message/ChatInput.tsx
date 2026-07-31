import React, { useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { Paperclip, Smile, ArrowUp } from "lucide-react";

interface ChatInputProps {
  isMaximized: boolean;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  canSendMessages: boolean;
  activeUserName?: string;
  onFileButtonClick: () => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  onEmojiClick: (emojiData: { emoji: string }) => void;
}

const MAX_HEIGHT = 160; // px, caps growth before it scrolls internally

const ChatInput: React.FC<ChatInputProps> = ({
  isMaximized,
  message,
  onMessageChange,
  onSend,
  onKeyPress,
  canSendMessages,
  activeUserName,
  onFileButtonClick,
  showEmojiPicker,
  onToggleEmojiPicker,
  onEmojiClick,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Refs for detecting outside clicks
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-grow the textarea (and therefore the pill) as content wraps,
  // capping at MAX_HEIGHT and letting it scroll internally after that.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Resetting to exactly 36px guarantees the height perfectly matches the buttons on line 1
    el.style.height = "36px"; 
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [message]);

  // Handle click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        onToggleEmojiPicker();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker, onToggleEmojiPicker]);

return (
<footer className="flex-shrink-0 pl-2 pr-3 pb-2 sm:pl-3 sm:pr-4 sm:pb-3">
      {/* 
        Added mx-[3%] to introduce a 3% margin on both the left and right sides.
      */}
<div
  className={`flex items-end gap-1.5 sm:gap-2 ${isMaximized ? "mx-[3%]" : "" } rounded-[24px] border border-white/10
    bg-white/[0.05] p-1.5 sm:p-2
    focus-within:bg-white/[0.08] transition-colors`}
>
        <button
          onClick={onFileButtonClick}
          disabled={!canSendMessages}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full
            text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Paperclip size={18} />
        </button>

        <div className="flex-1 relative min-w-0 flex flex-col justify-end">
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef} 
              className="absolute bottom-full mb-2 right-0 z-50"
            >
              <EmojiPicker onEmojiClick={onEmojiClick} height={400} />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={!canSendMessages}
            placeholder={
              !canSendMessages
                ? "Accept this chat request to reply..."
                : "Type a message..."
            }
            rows={1}
            className="w-full bg-transparent resize-none focus:outline-none text-sm
              text-white placeholder-white/40 m-0 px-1 py-[8px] leading-[20px] border-0"
            style={{ minHeight: "36px", maxHeight: `${MAX_HEIGHT}px` }} 
          />
        </div>

        <button
          ref={emojiButtonRef}
          onClick={onToggleEmojiPicker}
          disabled={!canSendMessages}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full
            text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Smile size={18} />
        </button>

        <button
          onClick={onSend}
          disabled={!message.trim()}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full
            bg-white text-black hover:bg-white/90
            disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed
            transition-colors shadow-sm"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </div>
    </footer>
  );
};

export default ChatInput;