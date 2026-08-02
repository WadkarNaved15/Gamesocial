import express from "express";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import verifyToken from "../middlewares/authMiddleware.js";
import mongoose from "mongoose";
import redisClient from "../config/redis.js";
const router = express.Router();
const CHAT_CACHE_LIMIT = 30;
// Send a message
router.post("/", verifyToken, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { chatId, text, receiverId } = req.body;

    const message = await Message.create({
      chatId,
      senderId,
      receiverId,
      text,
      seen: false
    });

    res.json(message);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});
// Get unread message counts
router.get("/unread-counts", verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const unread = await Message.aggregate([
      // Only unread messages for this receiver
      {
        $match: {
          receiverId: userId,
          seen: false,
        },
      },

      // Group by chat + sender first
      {
        $group: {
          _id: {
            chatId: "$chatId",
            senderId: "$senderId",
          },
          count: { $sum: 1 },
        },
      },

      // Lookup chat only once per chat
      {
        $lookup: {
          from: "chats",
          localField: "_id.chatId",
          foreignField: "_id",
          as: "chat",
        },
      },

      {
        $unwind: "$chat",
      },

      // Ignore declined chats
      {
        $match: {
          "chat.status": { $ne: "declined" },
        },
      },

      // Combine counts from different chats with the same sender
      {
        $group: {
          _id: "$_id.senderId",
          count: {
            $sum: "$count",
          },
        },
      },
    ]);

    res.json(unread);
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({
      message: "Failed to fetch unread counts",
    });
  }
});

// Mark messages as seen
router.put("/seen/:chatId", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { chatId } = req.params;

  const result = await Message.updateMany(
    {
      chatId,
      senderId: { $ne: userId },
      seen: false,
    },
    {
      $set: {
        seen: true,
        seenAt: new Date(),
      },
    }
  );

  return res.json({
    success: true,
    modifiedCount: result.modifiedCount,
  });

  res.json({ success: true });
});

// Get all messages for a chat
router.get("/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const limit = Math.min(
      parseInt(req.query.limit, 10) || CHAT_CACHE_LIMIT,
      50
    );

    const before = req.query.before;
    const cacheKey = `chat:messages:${chatId}`;

    // ====================================================
    // FIRST PAGE -> Try Redis Cache
    // ====================================================
    if (!before && limit === CHAT_CACHE_LIMIT) {
      console.log("Cache hit for chat:", chatId);
      // Read one extra message exactly like Mongo does
      // Read the newest cache window instead of the oldest
      const totalMessages = await redisClient.lLen(cacheKey);

      const start = Math.max(
        0,
        totalMessages - (CHAT_CACHE_LIMIT + 1)
      );

      const end = totalMessages - 1;

      const cached = await redisClient.lRange(
        cacheKey,
        start,
        end
      );

      if (cached.length > 0) {
        const hasMore = cached.length > CHAT_CACHE_LIMIT;

        if (hasMore) {
          cached.shift();
        }

        const messages = cached
          .map((msg) => JSON.parse(msg))

        const oldest = messages[0];

        const nextCursor = oldest
          ? Buffer.from(
            JSON.stringify({
              createdAt: oldest.createdAt,
              _id: oldest._id,
            })
          ).toString("base64")
          : null;

        return res.json({
          messages,
          hasMore,
          nextCursor,
        });
      }
    }

    // ====================================================
    // MongoDB Query
    // ====================================================

    const query = { chatId };

    if (before) {
      let cursor;

      try {
        cursor = JSON.parse(
          Buffer.from(before, "base64").toString("utf8")
        );
      } catch {
        return res.status(400).json({
          message: "Invalid cursor",
        });
      }

      const cursorDate = new Date(cursor.createdAt);

      query.$or = [
        {
          createdAt: { $lt: cursorDate },
        },
        {
          createdAt: cursorDate,
          _id: { $lt: cursor._id },
        },
      ];
    }

    const messages = await Message.find(query)
      .select(
        "senderId receiverId text mediaUrl mediaKey mediaType messageType sharedPostId seen createdAt"
      )
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(limit + 1)
      .lean();

    // Keep all fetched documents for Redis
    const cacheMessages = [...messages];

    const hasMore = messages.length > limit;

    if (hasMore) {
      messages.pop();
    }

    messages.reverse();

    const oldest = messages[0];

    const nextCursor = oldest
      ? Buffer.from(
        JSON.stringify({
          createdAt: oldest.createdAt,
          _id: oldest._id,
        })
      ).toString("base64")
      : null;

    // ====================================================
    // Refresh Redis Cache (ONLY first page)
    // ====================================================

    if (!before && limit === CHAT_CACHE_LIMIT) {
      const pipeline = redisClient.multi();
      pipeline.del(cacheKey);

      // Store newest -> oldest
      for (const message of cacheMessages.reverse()) {
        pipeline.rPush(
          cacheKey,
          JSON.stringify(message)
        );
      }
      pipeline.expire(cacheKey, 60 * 60 * 6);

      await pipeline.exec();
    }

    res.json({
      messages,
      hasMore,
      nextCursor,
    });
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({
      message: "Failed to fetch messages",
    });
  }
});
// Share a post in a chat
router.post("/share-post", async (req, res) => {
  try {
    const { chatId, senderId, postId } = req.body;

    const message = await Message.create({
      chatId,
      senderId,
      messageType: "post",
      sharedPostId: postId
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to share post" });
  }
});


export default router;