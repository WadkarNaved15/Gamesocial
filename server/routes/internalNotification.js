import express from "express";
import Notification from "../models/Notifications.js";

const router = express.Router();

export default function internalNotificationRoutes(io) {

  router.post("/notify-realtime", async (req, res) => {
    console.log("io exists?", !!io);
    console.log("notify-realtime got hit");
    console.log("Header Secret:", req.headers["x-internal-secret"]);
    console.log("Env Secret:", process.env.INTERNAL_SECRET);
    const secret = req.headers["x-internal-secret"];
    if (secret !== process.env.INTERNAL_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const { recipientId, notificationId } = req.body;

      // ✅ Fetch full populated notification
      const fullNotification = await Notification.findById(notificationId)
        .populate("actorsPreview", "username avatar")
        .populate("postId", "description assets");

      if (!fullNotification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      io.to(`user-${recipientId}`).emit(
        "new-notification",
        fullNotification
      );
      console.log(
        `🔥 Notification emitted to user-${recipientId}`
      );

      return res.json({ success: true });
    } catch (err) {
      console.error("Socket Notify Error:", err);

      res.status(500).json({
        success: false,
        error: err.message,
        stack: err.stack,
      });
    }
  });

  return router;
}
