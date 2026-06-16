import NotificationCard from "../components/Home/NotificationCard";
import { useNotification } from "../context/Notifications";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CircleLoader from "../components/Loader/CircleLoader";

export default function NotificationsPage() {
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  } = useNotification();

  useEffect(() => {
    if (!loading && unreadCount > 0) {
      markAllAsRead();
    }
  }, [loading, unreadCount]);

  return (
    <div className="w-full mt-4 flex flex-col">
      
      

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Notifications{" "}
          {unreadCount > 0 && (
            <span className="text-sky-500">({unreadCount})</span>
          )}
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div className="w-full flex justify-center mt-4">
          <CircleLoader />
        </div>
      )}

      {/* Empty */}
      {!loading && notifications.length === 0 && (
        <div className="text-gray-400 dark:text-gray-500 mt-4">
          No notifications yet.
        </div>
      )}

      {/* List */}
      <div className="flex flex-col space-y-3">
        {notifications.map((n) => (
          <NotificationCard
            key={n._id}
            notification={n}
            onRead={markAsRead}
          />
        ))}
      </div>
    </div>
  );
}