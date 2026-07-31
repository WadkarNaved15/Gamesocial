import React from "react";
import { Search, MessageCircle } from "lucide-react";
import { ChatUser } from "./types";

interface UsersListPanelProps {
  isMaximized: boolean;
  /** True only for the sidebar shown alongside an open chat in maximized mode. */
  isSidebarVariant: boolean;
  activeChat?: string | null;
  loading: boolean;
  filteredUsers: ChatUser[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onUserClick: (userId: string) => void;
  unreadCounts: Record<string, number>;
  onlineUsers: string[];
}

/**
 * Renders the search box + list of conversations/contacts.
 * The "sidebar" variant (used when a chat is open in maximized mode) skips
 * the loading/empty states and highlights the active conversation, matching
 * the original component's behavior.
 */
const UsersListPanel: React.FC<UsersListPanelProps> = ({
  isMaximized,
  isSidebarVariant,
  activeChat,
  loading,
  filteredUsers,
  searchTerm,
  onSearchChange,
  onUserClick,
  unreadCounts,
  onlineUsers,
}) => {
  return (
    <>
{/* Search */}
      <div
        className={`py-4 px-2 border-b ${
          isSidebarVariant || isMaximized ? "border-white/20" : "border-gray-200 dark:border-gray-700"
        } flex-shrink-0`}
      >
        <div className="relative">
          <Search
            size={18}
            // Add z-10 and pointer-events-none here!
            className={`absolute left-3 top-2.5 z-10 pointer-events-none ${
              isSidebarVariant || isMaximized ? "text-white/60" : "text-gray-400 dark:text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none ${
              isSidebarVariant || isMaximized
                ? "bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:ring-2 focus:ring-white/40"
                : "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400"
            }`}
          />
        </div>
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {!isSidebarVariant && loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-700 border-t-gray-600 dark:border-t-white rounded-full animate-spin mb-3"></div>
            <p className={`${isMaximized ? "text-white/70" : "text-gray-500 dark:text-gray-400"} text-sm`}>
              Loading users...
            </p>
          </div>
        ) : !isSidebarVariant && filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
            <div className={`${isMaximized ? "text-white/30" : "text-gray-300 dark:text-gray-600"} mb-4`}>
              <MessageCircle size={48} />
            </div>

            <h3 className={`font-medium text-lg mb-2 ${isMaximized ? "text-white" : "text-gray-900 dark:text-white"}`}>
              {searchTerm ? "No matching users" : "No users yet"}
            </h3>

            <p className={`${isMaximized ? "text-white/60" : "text-gray-500 dark:text-gray-400"} text-sm max-w-[220px]`}>
              {searchTerm
                ? `No users found matching "${searchTerm}"`
                : "You haven't chatted with anyone yet. Start a conversation!"}
            </p>

            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="mt-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              onClick={() => onUserClick(u.id)}
              className={`flex items-center py-3 px-4 cursor-pointer transition-colors border-b ${
                isSidebarVariant
                  ? `border-white/10 ${activeChat === u.id ? "bg-white/20" : "hover:bg-white/10"}`
                  : isMaximized
                  ? "hover:bg-white/10 border-white/10"
                  : "hover:bg-gray-50 dark:hover:bg-gray-900 border-gray-100 dark:border-gray-800"
              }`}
            >
              <div className="relative">
                <div className="relative w-10 h-10">
                  <img
                    src={u.avatar ? u.avatar : "/default_avatar.png"}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      img.src = "/default_avatar.png";
                    }}
                  />
                </div>
                {!isSidebarVariant && onlineUsers.includes(u.id) && (
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${
                      isMaximized ? "border-white" : "border-white dark:border-black"
                    } bg-green-400`}
                  />
                )}
              </div>

              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`${
                      isSidebarVariant || isMaximized ? "text-white" : "text-gray-900 dark:text-white"
                    } font-semibold text-sm`}
                  >
                    {u.name}
                  </h4>

                  {(unreadCounts[u.id] ?? 0) > 0 && (!isSidebarVariant || activeChat !== u.id) && (
                    <div
                      className={`text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                        isSidebarVariant || isMaximized
                          ? "bg-pink-500 text-white"
                          : "bg-gray-600 dark:bg-gray-400 text-white dark:text-black"
                      }`}
                    >
                      {unreadCounts[u.id]}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default UsersListPanel;