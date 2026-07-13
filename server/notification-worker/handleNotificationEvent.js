import Notification from "../models/Notifications.js";
import axios from "axios";
export const handleNotificationEvent = async (event) => {
  const { type, actorId, recipientId, postId, chatId } = event;

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const notification = await Notification.findOneAndUpdate(
    {
      recipientId,
      type,
      postId: postId || null,
      chatId: chatId || null,

      ...(type !== "CHAT_REQUEST" && {
        createdAt: { $gte: tenMinutesAgo },
        isRead: false,
      }),
    },
    {
      // ✅ Increment count safely
      $inc: { count: 1 },

      // ✅ Keep last 3 actors
      $push: {
        actorsPreview: {
          $each: [actorId],
          $position: 0,
          $slice: 3,
        },
      },

      // ✅ Only set these when document is first created
      $setOnInsert: {
        recipientId,
        type,
        postId: postId || null,
        chatId: chatId || null,
        createdAt: new Date(),
        isRead: false,
      },
    },
    { upsert: true, new: true }
  );

  console.log("✅ Notification Stored / Aggregated");
  // ✅ REALTIME SOCKET PUSH (Worker → Backend)
  console.log("🚀 Pushing notification in real-time");
  await axios.post(
    `${process.env.BACKEND_URL}/api/internal-notify/notify-realtime`,
    {
      recipientId,
      notificationId: notification._id,
    },
    {
      headers: {
        "x-internal-secret": process.env.INTERNAL_SECRET,
      },
    }
  );
  console.log("🚀 Notification pushed in real-time");
};
