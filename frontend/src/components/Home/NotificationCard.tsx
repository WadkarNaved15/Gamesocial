import { NotificationType } from "../../context/Notifications";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  notification: NotificationType;
  onRead: (id: string) => void;
}

export default function NotificationCard({ notification, onRead }: Props) {
  const actor = notification.actorsPreview?.[0];
  const navigate = useNavigate();
  // ✅ Safe description fallback
  const postDescription = notification.postId?.description ?? "";

  const postText =
    postDescription.length > 60
      ? postDescription.slice(0, 60) + "..."
      : postDescription;

  // ✅ Action mapping
  const actionMap: Record<NotificationType["type"], string> = {
  LIKE: "liked your post",
  COMMENT: "commented on your post",

  MENTION_COMMENT: "mentioned you in a comment",
  MENTION_POST: "mentioned you in a post",

  INTERACT_COMMENT: "mentioned @interact in a comment",
  INTERACT_POST: "mentioned @interact in a post",

  FOLLOW: "followed you",

  CHAT_REQUEST: "sent you a chat request",
};

const actionText = actionMap[notification.type];

  return (
    <div
      onClick={() => onRead(notification._id)}
      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition
        ${notification.isRead
          ? "bg-[#191919] border-white/10"
          : "bg-[#222] border-sky-500/40"
        }
      `}
    >
      {/* Avatar */}
      <img
        src={actor?.avatar || "/default_avatar.png"}
        alt={actor?.username ?? "User avatar"}
        className="h-11 w-11 rounded-full object-cover"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/profile/${actor?.username}`);
        }}
      />

      {/* Content */}
      <div className="flex-1">
        {!notification.isRead && (
          <span className="h-2 w-2 rounded-full bg-red-500 mt-2"></span>
        )}
        {/* Main Text */}
        <p className="text-sm text-white leading-snug">
          <span className="font-semibold">
            {actor?.username ?? "Someone"}
          </span>{" "}
          {notification.count > 1 ? (
            <span className="text-gray-400">
              and {notification.count - 1} others{" "}
            </span>
          ) : null}
          {actionText}
        </p>

        {/* ✅ Post Preview Only If Exists */}
        {notification.type !== "CHAT_REQUEST" &&
          notification.postId &&
          postDescription && (
            <Link
              to={`/post/${notification.postId._id}`}
              className="block mt-1 text-gray-400 text-sm hover:text-white transition"
            >
              “{postText}”
            </Link>
          )}

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mt-2">
          {new Date(notification.createdAt).toLocaleString(undefined, {
            dateStyle: "short",
            timeStyle: "short"
          })}
        </p>
      </div>
    </div>
  );
}
