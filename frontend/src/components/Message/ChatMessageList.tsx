import React, {
  useLayoutEffect,
  useRef,
  useEffect,
  useCallback,
} from "react";
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
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  currentChatId: string | null;
}

/**
 * Production chat scroll constants.
 *
 * We intentionally use a small bottom threshold.
 * If the user has actually started reading history, new messages
 * must NOT move their viewport.
 */
const NEAR_BOTTOM_PX = 40;
const NEAR_TOP_PX = 80;

type PrependSnapshot = {
  scrollHeight: number;
  scrollTop: number;
};

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
  hasMore,
  loadingMore,
  onLoadMore,
  currentChatId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const paginationLockRef = useRef(false);
  const prependSnapshotRef = useRef<PrependSnapshot | null>(null);
  const previousMessageCountRef = useRef(messages.length);

  useLayoutEffect(() => {
    initialScrollDoneRef.current = false;
    stickToBottomRef.current = true;
    paginationLockRef.current = false;
    prependSnapshotRef.current = null;
    previousMessageCountRef.current = messages.length;
  }, [currentChatId]);

  const updateBottomState = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    stickToBottomRef.current =
      distanceFromBottom <= NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container || messages.length === 0) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    if (!initialScrollDoneRef.current) {
      scrollToBottom();

      initialScrollDoneRef.current = true;
      previousMessageCountRef.current = messages.length;

      return;
    }

    if (prependSnapshotRef.current) {
      const snapshot = prependSnapshotRef.current;

      const heightDifference =
        container.scrollHeight - snapshot.scrollHeight;

      container.scrollTop =
        snapshot.scrollTop + heightDifference;

      prependSnapshotRef.current = null;
      paginationLockRef.current = false;

      previousMessageCountRef.current = messages.length;

      return;
    }

    if (stickToBottomRef.current) {
      scrollToBottom();
    }

    previousMessageCountRef.current = messages.length;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;

        updateBottomState();
        if (
          container.scrollTop <= NEAR_TOP_PX &&
          hasMore &&
          !loadingMore &&
          !paginationLockRef.current
        ) {
          prependSnapshotRef.current = {
            scrollHeight: container.scrollHeight,
            scrollTop: container.scrollTop,
          };

          paginationLockRef.current = true;

          onLoadMore();
        }
      });
    };

    container.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [
    hasMore,
    loadingMore,
    onLoadMore,
    updateBottomState,
  ]);

  useEffect(() => {
    if (!loadingMore && !prependSnapshotRef.current) {
      paginationLockRef.current = false;
    }
  }, [loadingMore]);

  return (
    <main
      ref={containerRef}
      style={{
        overflowAnchor: "none",
      }}
      className="relative flex-1 h-full min-h-0 overflow-y-auto"
    >
      {loadingMore && (
        <div className="absolute top-2 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="pl-2 pr-3 py-3 sm:pl-3 sm:pr-4 sm:py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.clientId || msg._id || msg.tempId || msg.id}>
            <MessageBubble
              msg={msg}
              currentUser={currentUser}
              isMenuOpen={
                openMenuId === (msg._id || msg.tempId)
              }
              onToggleMenu={onToggleMenu}
              onDelete={onDeleteMessage}
              onMediaClick={onMediaClick}
            />
          </div>
        ))}

        {activeChatStatus === "pending" &&
          !requestedByCurrentUser && (
            <ChatRequestBanner
              status="pending"
              requesterName={activeUserName || "This user"}
              statusLoading={statusLoading}
              onAccept={onAcceptChat}
              onDecline={onDeclineChat}
            />
          )}

        {activeChatStatus === "declined" &&
          !requestedByCurrentUser && (
            <ChatRequestBanner
              status="declined"
              requesterName={activeUserName || "This user"}
              statusLoading={statusLoading}
              onAccept={onAcceptChat}
            />
          )}

        <div
          ref={messagesEndRef}
          className="h-px w-full min-h-[1px]"
        />
      </div>
    </main>
  );
};

export default ChatMessageList;