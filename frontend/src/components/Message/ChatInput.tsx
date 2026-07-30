import React from "react";
import EmojiPicker from "emoji-picker-react";
import { Paperclip, Smile, Send } from "lucide-react";

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
  return (
    <footer
      className={`flex-shrink-0 p-4 border-t ${
        isMaximized ? "border-white/20 bg-black/20 backdrop-blur-xl" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-black"
      }`}
    >
      <div className="flex items-center space-x-2">
        <button
          onClick={onFileButtonClick}
          disabled={!canSendMessages}
          className={`${
            isMaximized ? "text-white/60 hover:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          } transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Paperclip size={18} />
        </button>

        <div className="flex-1 relative">
          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 right-0 z-50">
              <EmojiPicker onEmojiClick={onEmojiClick} height={400} />
            </div>
          )}
          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={!canSendMessages}
            placeholder={!canSendMessages ? "Accept this chat request to reply..." : `Message ${activeUserName || ""}...`}
            className={`w-full p-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:border-transparent text-sm ${
              isMaximized
                ? "bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-white/40"
                : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-gray-400"
            }`}
            rows={1}
            style={{ minHeight: "36px", maxHeight: "80px" }}
          />
        </div>
        <button
          onClick={onToggleEmojiPicker}
          disabled={!canSendMessages}
          className={`${
            isMaximized ? "text-white/60 hover:text-white" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          } transition-colors`}
        >
          <Smile size={18} />
        </button>
        <button
          onClick={onSend}
          disabled={!message.trim()}
          className={`p-2 rounded-lg transition-all disabled:cursor-not-allowed ${
            isMaximized
              ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-500 disabled:to-gray-500 text-white"
              : "bg-gray-600 dark:bg-gray-400 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white dark:text-black"
          }`}
        >
          <Send size={16} />
        </button>
      </div>
    </footer>
  );
};

export default ChatInput;