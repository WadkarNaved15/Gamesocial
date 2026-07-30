import React, { useLayoutEffect, useRef, useEffect, useCallback } from "react";
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
  onLoadMore: () => void; // fire-and-forget from here; guard lives in the parent
  currentChatId: string | null;
}

const NEAR_BOTTOM_PX = 150;
const NEAR_TOP_PX = 80;
const SETTLE_MS = 500; // how long to keep chasing the anchor after a prepend

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
  const contentRef = useRef<HTMLDivElement>(null);

  const initialScrollDone = useRef(false);
  const stickToBottom = useRef(true);
  const anchor = useRef<{ node: HTMLElement; top: number } | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollLockRef = useRef(false); // synchronous — the actual fix

  useEffect(() => {
    initialScrollDone.current = false;
    stickToBottom.current = true;
    anchor.current = null;
    scrollLockRef.current = false;
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, [currentChatId]);

  // Release the synchronous lock the moment the parent tells us loading finished —
  // this runs off the prop, so it's a *release*, never used as the guard to fetch.
  useEffect(() => {
    if (!loadingMore) scrollLockRef.current = false;
  }, [loadingMore]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const c = containerRef.current;
    if (!c) return;
    if (behavior === "smooth") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } else {
      c.scrollTop = c.scrollHeight;
    }
  }, [messagesEndRef]);

  const clearAnchorSoon = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      anchor.current = null;
    }, SETTLE_MS);
  }, []);

  const applyAnchorCorrection = useCallback(() => {
    const container = containerRef.current;
    if (!container || !anchor.current) return false;
    const { node, top } = anchor.current;
    if (!node.isConnected) {
      // The node we were tracking is gone (dupe/remount) — bail out instead
      // of computing garbage math that throws the scroll position around.
      anchor.current = null;
      return false;
    }
    const newTop = node.getBoundingClientRect().top;
    container.scrollTop += newTop - top;
    anchor.current.top = newTop;
    return true;
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    if (!initialScrollDone.current) {
      container.scrollTop = container.scrollHeight;
      initialScrollDone.current = true;
      return;
    }

    if (anchor.current) {
      applyAnchorCorrection();
      clearAnchorSoon();
    } else if (stickToBottom.current) {
      scrollToBottom("smooth");
    }
  }, [messages, applyAnchorCorrection, clearAnchorSoon, scrollToBottom]);

  // Catches late-loading media, avatars, etc. — same correction path,
  // just triggered by layout size change instead of a messages-array change.
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const ro = new ResizeObserver(() => {
      if (anchor.current) {
        applyAnchorCorrection();
        clearAnchorSoon();
      } else if (stickToBottom.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    ro.observe(content);
    return () => ro.disconnect();
  }, [applyAnchorCorrection, clearAnchorSoon]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!initialScrollDone.current) return;

        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;
        stickToBottom.current = distanceFromBottom < NEAR_BOTTOM_PX;

        if (
          container.scrollTop < NEAR_TOP_PX &&
          hasMore &&
          !scrollLockRef.current &&        // synchronous — set+checked in the same tick
          content?.firstElementChild
        ) {
          scrollLockRef.current = true;    // locked immediately, no state round-trip
          anchor.current = {
            node: content.firstElementChild as HTMLElement,
            top: content.firstElementChild.getBoundingClientRect().top,
          };
          onLoadMore();
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, onLoadMore]);

  return (
    <main
      ref={containerRef}
      style={{ overflowAnchor: "none" }}
      className={`flex-1 overflow-y-auto ${
        isMaximized ? "bg-black/20 backdrop-blur-sm" : "bg-gray-50 dark:bg-gray-900"
      }`}
    >
      <div ref={contentRef} className="p-4 space-y-3">
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.clientId || msg._id || msg.tempId || msg.id}>
            <MessageBubble
              msg={msg}
              currentUser={currentUser}
              isMenuOpen={openMenuId === (msg._id || msg.tempId)}
              onToggleMenu={onToggleMenu}
              onDelete={onDeleteMessage}
              onMediaClick={onMediaClick}
            />
          </div>
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

        <div ref={messagesEndRef} className="h-px w-full min-h-[1px]" />
      </div>
    </main>
  );
};

export default ChatMessageList;