import React from "react";
import { MessageCircle } from "lucide-react";

interface ChatToggleButtonProps {
  unreadCount: number;
  onClick: () => void;
}

/**
 * The floating launcher button shown when the chat window is fully closed.
 */
const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ unreadCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        bg-black
        text-white
        p-4 
        rounded-full
        border border-solid border-white/40
        shadow-5xl   
        transition-all duration-300 transform
        hover:scale-110
        group relative
        flex items-center justify-center
      "
    >
      <MessageCircle size={24} className="group-hover:animate-pulse text-white" />

      {unreadCount > 0 && (
        <div
          className="
            absolute -top-2 -right-2
            bg-red-500 text-white text-xs
            rounded-full h-5 w-5 flex items-center justify-center
            animate-pulse
          "
        >
          {unreadCount}
        </div>
      )}
    </button>
  );
};

export default ChatToggleButton;