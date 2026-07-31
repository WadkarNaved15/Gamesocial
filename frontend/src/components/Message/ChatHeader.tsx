import React from "react";
import { MessageCircle, X, Maximize2, Square } from "lucide-react";
import Logo from "../../assets/Icon.svg?react"; // Imported Logo exactly like in your Header

interface ChatHeaderProps {
  isMinimized: boolean;
  isMaximized: boolean;
  usersCount: number;
  onRestore: () => void;
  /** Button shown in the minimized header — mirrors the original component's behavior of always reopening the modal. */
  onMinimizedActionClick: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  isMinimized,
  isMaximized,
  usersCount,
  onRestore,
  onMinimizedActionClick,
  onToggleMaximize,
  onClose,
}) => {
  return (
    <div
      className={`flex-shrink-0 h-16 ${
        isMaximized
          ? "bg-white/10 backdrop-blur-xl border-b border-white/20 text-white"
          : "bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700"
      } p-4 flex items-center justify-between`}
    >
      {isMinimized ? (
        <>
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onRestore}>
            {/* Logo replacing the default MessageCircle icon */}
            <div className="flex items-center justify-center">
              <Logo className="h-8 w-auto text-[#469D84]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Messages</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{usersCount} contacts</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onMinimizedActionClick}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded"
            >
              {isMaximized ? <Square size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={onClose} className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">
              <X size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center space-x-3">
            {/* Logo replacing the activeUser avatar logic */}
            <div className="flex items-center justify-center">
              <Logo className="h-9 w-auto text-[#469D84]" />
            </div>
            
            {/* Static Messages text replacing the activeUser.name logic */}
            <div>
              <h3
                className={`font-semibold text-sm ${
                  isMaximized ? "text-white" : "text-gray-900 dark:text-white"
                }`}
              >
                Messages
              </h3>
              <p
                className={`text-xs ${
                  isMaximized ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {usersCount} contacts
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onToggleMaximize}
              className={`p-1 rounded ${
                isMaximized ? "hover:bg-white/20" : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {isMaximized ? <Square size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className={`p-1 rounded ${
                isMaximized ? "hover:bg-white/20" : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <X size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatHeader;