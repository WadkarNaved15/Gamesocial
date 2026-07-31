import React, { useState, useRef, useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import axios from "axios";
import { useUser } from "../../context/user";
import { useChat } from "../../context/ChatContext";
import { useUsers } from "../../context/UsersContext";
import MediaViewer from "../Media/MediaViewer";
import { toast } from "react-toastify";

import ChatToggleButton from "../Message/ChatToggleButton";
import ChatHeader from "../Message/ChatHeader";
import UsersListPanel from "../Message/UsersListPanel";
import ChatMessageList from "../Message/ChatMessageList";
import ChatInput from "../Message/ChatInput";
import { Message, ChatId, MediaViewerState } from "../Message/types";
import { MessageCircle } from "lucide-react";

type UploadAsset = {
  file: File;
  type: "image" | "video" | "misc";
};

const MessagingComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatId | null>(null);
  const [requestedUser, setRequestedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [statusLoading, setStatusLoading] = useState<"accepted" | "declined" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatHasMore, setChatHasMore] = useState<Record<string, boolean>>({});
  const [chatCursors, setChatCursors] = useState<Record<string, string | null>>({});
  const [loadingOlderMessages, setLoadingOlderMessages] = useState<
    Record<string, boolean>
  >({});
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState | null>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const [activeChatStatus, setActiveChatStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const { users, loading, setUsers } = useUsers();
  const currentUser = user?._id;
  const { targetUser } = useChat();
  const socket = useSocket();
  const [isRendered, setIsRendered] = useState(false); // NEW: Controls actual DOM presence 
  const [isVisible, setIsVisible] = useState(false);
  const chatRequestIdRef = useRef(0);
  const isFetchingOlderRef = useRef<Record<string, boolean>>({});
  const lastFetchedCursorRef = useRef<Record<string, string | null>>({});

  // NEW: Delays the unmounting of the chat window so the close animation can play
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true); // 1. Put it in the DOM
      const timer = setTimeout(() => setIsVisible(true), 100); // 2. Wait 100ms, then trigger animation
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false); // 1. Trigger the close animation
      const timer = setTimeout(() => setIsRendered(false), 300); // 2. Wait 300ms, then remove from DOM
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // CSS animation for shine
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
    @keyframes shine {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    .animate-shine {
      animation: shine 3s infinite;
    }
  `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [conversations, setConversations] = useState<Record<string, Message[]>>({});

  const uploadChatMediaToS3 = async (
    asset: UploadAsset,
    onProgress: (percent: number) => void
  ): Promise<{ fileUrl: string; key: string }> => {
    const res = await fetch(`${BACKEND_URL}/api/upload/presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fileName: asset.file.name,
        fileType: asset.file.type,
        category: "media",
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to get presigned URL");
    }

    const { uploadUrl, fileUrl, key } = await res.json();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", asset.file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve({ fileUrl, key });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload network error"));

      xhr.send(asset.file);
    });
  };

  const loadOlderMessages = async () => {
    if (!activeChat || !currentChatId) return;
    if (!chatHasMore[activeChat]) return;

    // Synchronous ref check+set — no async/state gap for a duplicate call to slip through
    if (isFetchingOlderRef.current[activeChat]) return;

    const cursor = chatCursors[activeChat];
    if (!cursor) return;

    // Refuse to re-fetch the exact same page twice (covers the case where the
    // lock above already released but a duplicate call was queued with a stale cursor)
    if (lastFetchedCursorRef.current[activeChat] === cursor) return;

    isFetchingOlderRef.current[activeChat] = true;
    lastFetchedCursorRef.current[activeChat] = cursor;
    setLoadingOlderMessages((prev) => ({ ...prev, [activeChat]: true }));

    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/messages/${currentChatId}`, {
        params: { before: cursor, limit: 30 },
        withCredentials: true,
      });

      setConversations((prev) => {
        const existing = prev[activeChat] || [];
        const existingIds = new Set(existing.map((m) => m._id));
        // Belt-and-suspenders: even if a dupe page slipped through, never let
        // duplicate _ids reach the DOM and corrupt React's key reconciliation.
        const deduped = data.messages.filter((m: Message) => !existingIds.has(m._id));
        return { ...prev, [activeChat]: [...deduped, ...existing] };
      });

      setChatHasMore((prev) => ({ ...prev, [activeChat]: data.hasMore }));
      setChatCursors((prev) => ({ ...prev, [activeChat]: data.nextCursor }));
    } catch (err) {
      console.error(err);
      // Allow retry on failure by rolling back the cursor guard
      lastFetchedCursorRef.current[activeChat] = null;
    } finally {
      isFetchingOlderRef.current[activeChat] = false;
      setLoadingOlderMessages((prev) => ({ ...prev, [activeChat]: false }));
    }
  };

  const onEmojiClick = (emojiData: { emoji: string }) => {
    setMessage((prev) => prev + emojiData.emoji);
  };



  useEffect(() => {
    if (!currentUser) return;

    const fetchUnreadCounts = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/messages/unread-counts`, { withCredentials: true });

        const counts: Record<string, number> = {};
        res.data.forEach((item: any) => {
          counts[item._id] = item.count;
        });

        setUnreadCounts((prev) => ({ ...prev, ...counts }));
      } catch (err) {
        console.error("Failed to load unread counts", err);
      }
    };

    fetchUnreadCounts();
  }, [currentUser]);

  useEffect(() => {
    if (!targetUser || targetUser.id === currentUser) return;

    setIsOpen(true);

    setUsers((prev) => {
      const exists = prev.find((u) => u.id === targetUser.id);
      if (exists) return prev;

      return [
        {
          id: targetUser.id,
          name: targetUser.name,
          avatar: targetUser.avatar,
          unreadCount: 0,
          lastSeen: "Just now",
        },
        ...prev,
      ];
    });

    handleUserClick(targetUser.id);
  }, [targetUser, currentUser]);

  useEffect(() => {
    if (!socket) return;

    socket.on("online-users", (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on("user-online", (userId: string) => {
      setOnlineUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    });

    socket.on("user-offline", (userId: string) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      socket.off("online-users");
      socket.off("user-online");
      socket.off("user-offline");
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const unreadHandler = ({ senderId }: any) => {
      // 1. Check if the message is from the active chat
      if (senderId === activeChat) {
        // 2. Tell the backend it was seen immediately
        if (currentChatId) {
          axios.put(`${BACKEND_URL}/api/messages/seen/${currentChatId}`, {}, { withCredentials: true })
            .catch(err => console.error("Failed to mark background message as seen", err));
        }
        // 3. Exit early so the unread count DOES NOT increment
        return;
      }

      setUnreadCounts((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    };

    socket.on("new-unread-message", unreadHandler);

    return () => {
      socket.off("new-unread-message", unreadHandler);
    };
    // 4. IMPORTANT: Add activeChat and currentChatId here so the function has the latest data
  }, [socket, currentUser, activeChat, currentChatId]);

  useEffect(() => {
    if (!socket || !currentUser) return;
    const handler = (msg: any) => {
      if (!currentUser) return;

      if (!currentChatId) {
        setCurrentChatId(msg.chatId);
        socket.emit("join_chat", msg.chatId);
      }

      const otherUserId = msg.senderId === currentUser ? msg.receiverId : msg.senderId;

      setConversations((prev) => {
        const existingMessages = prev[otherUserId] || [];

        if (msg.senderId === currentUser && msg.tempId) {
          return {
            ...prev,
            [otherUserId]: existingMessages.map((m) => (m.tempId === msg.tempId ? msg : m)),
          };
        }

        return {
          ...prev,
          [otherUserId]: [...existingMessages, msg],
        };
      });
    };

    socket.on("receive-message", handler);

    return () => {
      socket.off("receive-message", handler);
    };
  }, [socket, currentUser, activeChat, currentChatId]);

  useEffect(() => {
    if (!socket) return;

    const handleMessageDeleted = ({ messageId }: any) => {
      setConversations((prev) => {
        const updated = { ...prev };

        Object.keys(updated).forEach((userId) => {
          updated[userId] = updated[userId].filter((msg) => msg._id !== messageId);
        });

        return updated;
      });
    };

    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [socket]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!socket || !currentUser) return;
    if (!canSendMessages) return;
    const file = e.target.files?.[0];
    if (!file || !currentChatId || !activeChat || !currentUser) return;

    const toastId = toast.loading("Uploading... 0%");

    try {
      const { fileUrl, key } = await uploadChatMediaToS3(
        {
          file,
          type: file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "misc",
        },
        (progress) => {
          toast.update(toastId, {
            render: `Uploading... ${progress}%`,
            isLoading: true,
          });
        }
      );

      toast.update(toastId, {
        render: "Upload complete!",
        type: "success",
        isLoading: false,
        autoClose: 1200,
      });
      const tempId = Date.now().toString();
      const newMessage = {
        tempId,
        chatId: currentChatId,
        senderId: currentUser,
        receiverId: activeChat,
        text: "",
        mediaUrl: fileUrl,
        mediaKey: key,
        mediaType: file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "misc",
        createdAt: new Date(),
      };

      socket.emit("send-message", newMessage);

      setConversations((prev) => ({
        ...prev,
        [activeChat]: [...(prev[activeChat] || []), newMessage],
      }));
    } catch (err) {
      console.error(err);

      toast.update(toastId, {
        render: "Upload failed!",
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    } finally {
      e.target.value = "";
    }
  };

  const handleUserClick = async (receiverId: string) => {
    if (receiverId === currentUser) {
      toast.error("Cannot chat with yourself");
      return;
    }
    const requestId = ++chatRequestIdRef.current;
    try {
      if (currentChatId && socket) {
        socket.emit("leave_chat", currentChatId);
      }
      setActiveChat(receiverId);
      const { data } = await axios.post(`${BACKEND_URL}/api/chat/start`, { receiverId }, { withCredentials: true });

      if (chatRequestIdRef.current !== requestId) return; // a newer click superseded this one

      if (data?._id && socket) {
        setCurrentChatId(data._id);
        setRequestedUser(data);
        setActiveChatStatus(data.status);
        socket.emit("join_chat", data._id);
        const { data: messagesData } = await axios.get(
          `${BACKEND_URL}/api/messages/${data._id}`,
          { params: { limit: 30 }, withCredentials: true }
        );

        if (chatRequestIdRef.current !== requestId) return; // check again after the 2nd await

        setConversations((prev) => ({ ...prev, [receiverId]: messagesData.messages }));
        setChatHasMore((prev) => ({ ...prev, [receiverId]: messagesData.hasMore }));
        setChatCursors((prev) => ({ ...prev, [receiverId]: messagesData.nextCursor }));
        setCurrentChatId(data._id);
        socket.emit("join_chat", data._id);

        await axios.put(`${BACKEND_URL}/api/messages/seen/${data._id}`, {}, { withCredentials: true });
        setUnreadCounts((prev) => ({ ...prev, [receiverId]: 0 }));
      } else {
        setCurrentChatId(null);
        setRequestedUser(null);
        setActiveChatStatus(null);
        setConversations((prev) => ({
          ...prev,
          [receiverId]: [],
        }));
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const handleUpdateChatStatus = async (status: "accepted" | "declined") => {
    if (!currentChatId) return;
    setStatusLoading(status);
    try {
      const endpoint = status === "accepted" ? "accept" : "reject";

      await axios.put(`${BACKEND_URL}/api/chat-requests/${currentChatId}/${endpoint}`, {}, { withCredentials: true });

      setActiveChatStatus(status);
      setUsers((prev) => prev.map((u) => (u.id === activeUser?.id ? { ...u, chatStatus: status } : u)));
    } catch (err) {
      console.error(err);
      toast.error("Failed to update request");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleSendMessage = () => {
    if (!socket || !currentUser) return;
    if (!canSendMessages) return;
    if (!message.trim() || !activeChat) return;
    const tempId = Date.now();
    const newMessage = {
      tempId,
      chatId: currentChatId || null,
      senderId: currentUser ? currentUser : null,
      receiverId: activeChat,
      text: message,
      createdAt: new Date(),
    };

    socket.emit("send-message", newMessage);

    setConversations((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMessage],
    }));

    setMessage("");
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket) return;

    socket.emit("delete-message", { messageId });

    setOpenMenuId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getUnreadCount = () => Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const filteredUsers = users
    .filter((u) => u.id !== currentUser)
    .filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeUser = users.find((u) => u.id === activeChat);
  const isSender = requestedUser ? requestedUser.requestedBy === currentUser : true;

  const canSendMessages = isSender || activeChatStatus === "accepted";

  const toggleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const toggleClose = () => {
    if (currentChatId && socket) {
      socket.emit("leave_chat", currentChatId);
    }

    setIsOpen(false);
    setIsMinimized(false);
    setIsMaximized(false);
    setActiveChat(null);
    setCurrentChatId(null);
  };

  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleRestore = () => {
    setIsMaximized(false);
    setIsMinimized(false);
  };

  const toggleModal = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const leftSpacer = isMaximized && (
  <div className="w-14 shrink-0 border-r border-white/10" />
);

  return (
    <>
      {/* 1. Toggle Button - Use isVisible here */}
      <div
        className={`fixed z-50 bottom-6 right-6 transition-all duration-300 ease-in-out origin-center ${isVisible ? "opacity-0 scale-50 pointer-events-none" : "opacity-100 scale-100"
          }`}
      >
        <ChatToggleButton unreadCount={getUnreadCount()} onClick={toggleOpen} />
      </div>

      <input
        type="file"
        accept="image/*,video/*"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 2. Chat Window - Use isVisible here for the opacity/scale classes */}
{isRendered && (
  <div
    className={`fixed z-50 flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right
      ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"}
      ${isMaximized
        ?"bottom-0 right-0 w-full h-full rounded-none"
        : "bottom-6 right-6 w-80 rounded-lg border border-white/10 shadow-lg"
      } 
      ${isMinimized ? "h-16" : isMaximized ? "h-full" : "h-96"}
    `}
    style={{
      backgroundImage:
        "radial-gradient(150% 150% at 0% 0%, #000000 0%, #000000 20%, #141b2e 100%)",
    }}
  >
          <ChatHeader
            isMinimized={isMinimized}
            isMaximized={isMaximized}
            usersCount={users.length}
            onRestore={handleRestore}
            onMinimizedActionClick={toggleModal}
            onToggleMaximize={toggleMaximize}
            onClose={toggleClose}
          />

          {!isMinimized && (
            <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
              {!activeChat ? (
                <div
                  className={`flex w-full h-full overflow-hidden ${
                    isMaximized ? "max-w-[1920px] mx-auto" : "flex-col"
                  }`}
                >
                  {leftSpacer}
                  <div className={`${isMaximized ? "w-80 border border-white/20 flex flex-col overflow-hidden" : "w-full flex flex-col overflow-hidden min-h-0"}`}>
                    <UsersListPanel
                      isMaximized={isMaximized}
                      isSidebarVariant={false}
                      loading={loading}
                      filteredUsers={filteredUsers}
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      onUserClick={handleUserClick}
                      unreadCounts={unreadCounts}
                      onlineUsers={onlineUsers}
                    />
                  </div>

                  {isMaximized && (
                    <div className="flex-1 flex items-center justify-center overflow-hidden">
                      <div className="text-center text-white/80">
                        <MessageCircle size={48} className="mx-auto mb-4 text-white/60" />
                        <h3 className="text-xl font-semibold mb-2">Welcome to Messages</h3>
                        <p className="text-white/60">Select a conversation to start messaging</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <div
                className={`flex w-full h-full overflow-hidden ${
                  isMaximized ? "max-w-[1920px] mx-auto" : "flex-col"
                }`}
              >
                {leftSpacer}
                {isMaximized && (
                  <aside className="w-80 border border-white/20 flex flex-col overflow-hidden">
                    <UsersListPanel
                      isMaximized={isMaximized}
                      isSidebarVariant
                      activeChat={activeChat}
                      loading={loading}
                      filteredUsers={filteredUsers}
                      searchTerm={searchTerm}
                      onSearchChange={setSearchTerm}
                      onUserClick={handleUserClick}
                      unreadCounts={unreadCounts}
                      onlineUsers={onlineUsers}
                    />
                  </aside>
                )}

                <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
                  <ChatMessageList
                    isMaximized={isMaximized}
                    messages={conversations[activeChat] || []}
                    currentUser={currentUser}
                    openMenuId={openMenuId}
                    onToggleMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                    onDeleteMessage={handleDeleteMessage}
                    onMediaClick={setMediaViewer}
                    activeChatStatus={activeChatStatus}
                    requestedByCurrentUser={requestedUser?.requestedBy === currentUser}
                    activeUserName={activeUser?.name}
                    statusLoading={statusLoading}
                    onAcceptChat={() => handleUpdateChatStatus("accepted")}
                    onDeclineChat={() => handleUpdateChatStatus("declined")}
                    messagesEndRef={messagesEndRef}
                    hasMore={chatHasMore[activeChat] ?? false}
                    loadingMore={loadingOlderMessages[activeChat] ?? false}
                    onLoadMore={loadOlderMessages}
                    currentChatId={currentChatId}
                  />

                  <ChatInput
                    isMaximized={isMaximized}
                    message={message}
                    onMessageChange={setMessage}
                    onSend={handleSendMessage}
                    onKeyPress={handleKeyPress}
                    canSendMessages={canSendMessages}
                    activeUserName={activeUser?.name}
                    onFileButtonClick={() => fileInputRef.current?.click()}
                    showEmojiPicker={showEmojiPicker}
                    onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
                    onEmojiClick={onEmojiClick}
                  />
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {mediaViewer && (
        <MediaViewer
          assets={[{ url: mediaViewer.url, type: mediaViewer.type }]}
          startIndex={0}
          onClose={() => setMediaViewer(null)}
        />
      )}
    </>
  );
};

export default MessagingComponent;