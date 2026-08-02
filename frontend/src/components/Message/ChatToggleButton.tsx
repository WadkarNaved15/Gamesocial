import React from "react";

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
      style={{ backgroundColor: "transparent" }}
      className="
        flex items-center justify-center
        w-[72px] h-[51px] rounded-[26px] 
        border border-white/30
        transition-all duration-300 transform
        hover:scale-105
        group relative
      "
    >
      {/* 
        Custom Solid Envelope SVG 
      */}
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="white" 
        xmlns="http://www.w3.org/2000/svg"
        className="group-hover:animate-pulse"
      >
        <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" />
      </svg>

      {unreadCount > 0 && (
        <div
          className="
            absolute -top-1 -right-1
            bg-red-500 text-white text-xs font-bold
            rounded-full h-6 w-6 flex items-center justify-center
            animate-pulse shadow-md
          "
        >
          {unreadCount}
        </div>
      )}
    </button>
  );
};

export default ChatToggleButton;