import React, { useEffect } from "react";
import MessageBubble from "./MessageBubble";
import ChatRequestBanner from "./ChatRequestBanner";
import { Message, MediaViewerState } from "./types";

interface ChatMessageListProps {
  isMaximized: boolean;
  messages: Message[];
  currentUser: string | undefined;
  openMenuId: string | null;
  onToggleMenu: (id: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onMediaClick: (media: MediaViewerState) => void;
  activeChatStatus: string | null;
  requestedByCurrentUser: boolean;
  activeUserName?: string;
  statusLoading: "accepted" | "declined" | null;
  onAcceptChat: () => void;
  onDeclineChat: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  isMaximized,
  messages,
  currentUser,
  openMenuId,
  onToggleMenu,
  onDeleteMessage,
  onMediaClick,
  activeChatStatus,
  requestedByCurrentUser,
  activeUserName,
  statusLoading,
  onAcceptChat,
  onDeclineChat,
  messagesEndRef,
}) => {
  
  // NEW: Automatically scroll to the bottom whenever messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        // Using "auto" instead of "smooth" prevents the weird visual glitch 
        // of scrolling all the way down from the top when switching chats.
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };

    // A tiny 50ms delay gives the browser flexbox time to calculate the 
    // heights of the new text bubbles before attempting to scroll.
    const timeoutId = setTimeout(scrollToBottom, 50);

    return () => clearTimeout(timeoutId);
  }, [messages, messagesEndRef]);

  return (
    <main
      className={`flex-1 overflow-y-auto p-4 space-y-3 ${
        isMaximized ? "bg-black/20 backdrop-blur-sm" : "bg-gray-50 dark:bg-gray-900"
      }`}
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg._id || msg.tempId || msg.id}
          msg={msg}
          currentUser={currentUser}
          isMenuOpen={openMenuId === (msg._id || msg.tempId)}
          onToggleMenu={onToggleMenu}
          onDelete={onDeleteMessage}
          onMediaClick={onMediaClick}
        />
      ))}

      {activeChatStatus === "pending" && !requestedByCurrentUser && (
        <ChatRequestBanner
          status="pending"
          requesterName={activeUserName || "This user"}
          statusLoading={statusLoading}
          onAccept={onAcceptChat}
          onDecline={onDeclineChat}
        />
      )}

      {activeChatStatus === "declined" && !requestedByCurrentUser && (
        <ChatRequestBanner
          status="declined"
          requesterName={activeUserName || "This user"}
          statusLoading={statusLoading}
          onAccept={onAcceptChat}
        />
      )}

      {/* This invisible div acts as our anchor to pull the scrollbar down */}
      <div ref={messagesEndRef} className="h-px w-full" />
    </main>
  );
};

export default ChatMessageList;