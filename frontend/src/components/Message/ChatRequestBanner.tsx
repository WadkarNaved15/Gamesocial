import React from "react";

interface ChatRequestBannerProps {
  status: "pending" | "declined";
  requesterName: string;
  statusLoading: "accepted" | "declined" | null;
  onAccept: () => void;
  onDecline?: () => void;
}

/**
 * Shown to the receiver of a chat request while it's pending, or after
 * they've declined it (with an option to change their mind).
 */
const ChatRequestBanner: React.FC<ChatRequestBannerProps> = ({
  status,
  requesterName,
  statusLoading,
  onAccept,
  onDecline,
}) => {
  return (
    <div className="p-4 mt-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-black/50 backdrop-blur-sm text-center shadow-sm max-w-sm mx-auto animate-fade-in">
      {status === "pending" ? (
        <>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {requesterName || "This user"} wants to chat with you.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={onAccept}
              disabled={statusLoading !== null}
              className="flex items-center justify-center px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusLoading === "accepted" && (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
              )}
              Accept
            </button>
            <button
              onClick={onDecline}
              disabled={statusLoading !== null}
              className="flex items-center justify-center px-4 py-1.5 text-xs font-semibold bg-red-500/10 hover:bg-red-600/20 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusLoading === "declined" && (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
              )}
              Decline
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            You declined this chat request.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            If you&apos;ve changed your mind, you can accept this request and continue the conversation.
          </p>
          <button
            onClick={onAccept}
            disabled={statusLoading !== null}
            className="flex items-center justify-center mx-auto px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {statusLoading === "accepted" && (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
            )}
            Accept Chat Request
          </button>
        </>
      )}
    </div>
  );
};

export default ChatRequestBanner;