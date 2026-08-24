import express from "express";
import Chat from "../models/Chat.js";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();

// Start or get chat between current user & receiver
router.post("/start", verifyToken, async (req, res) => {
  try {
    const senderId = req.user.id; // from auth middleware
    const { receiverId } = req.body;
    console.log("Chat debug");
    console.log("Sender ID:", senderId);
    console.log("Receiver ID:", receiverId);
    if (senderId === receiverId) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }
    // ALWAYS sort participants to maintain consistency
    const participants = [senderId, receiverId].sort();
    const chatKey = participants.join("_");
    // Lookup using the indexed string
    const chat = await Chat.findOne({ chatKey }).lean();
    console.log("chat", chat);
    res.json(chat || null);
  } catch (err) {
    console.error("Chat start error:", err);
    res.status(500).json({ message: "Failed to start chat" });
  }
});

router.get("/my-chats", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({
      participants: userId,
    })
      .select("participants status requestedBy")
      .populate({
        path: "participants",
        select: "username avatar",
      })
      .lean();

    // 🔥 Format response → return ONLY other user
    const formatted = chats
      .map((chat) => {
        const participants = Array.isArray(chat.participants)
          ? chat.participants.filter(Boolean)
          : [];

        // Find the participant who isn't the current user.
        const otherUser = participants.find(
          (participant) =>
            participant?._id &&
            participant._id.toString() !== userId.toString()
        );
        
        if (!otherUser) {
          console.warn("[CHAT] Skipping invalid chat:", {
            chatId: chat._id?.toString(),
            currentUserId: userId.toString(),
            participants: chat.participants,
            reason: "Other participant does not exist",
          });

          return null;
        }

        return {
          chatId: chat._id,
          status: chat.status,
          requestedBy: chat.requestedBy,
          user: {
            id: otherUser._id,
            name: otherUser.username,
            avatar: otherUser.avatar || "",
          },
        };
      })
      .filter(Boolean);

    res.json(formatted);

  } catch (err) {
    console.error("Fetch chats error:", err);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

export default router;