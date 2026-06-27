// routes/wishListRoutes.js — Gorse save/unsave feedback hooks added
import express from "express";
import Wishlist from "../models/Wishlist.js";
import verifyToken from "../middlewares/authMiddleware.js";
import { insertFeedback, deleteFeedback, fireAndForget } from "../services/gorse.client.js";
import {
  onSaveAdded,
  onSaveRemoved,
} from "../services/analyticsEvents.js";
import { trackEvent } from "../services/analyticsService.js";

const router = express.Router();

// ── Fetch wishlisted posts (unchanged) ────────────────────────────────────────
router.get("/mine", verifyToken, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });

    const { cursor, limit = 10 } = req.query;
    let filter = { user: req.user.id };
    if (cursor) filter._id = { $lt: cursor };

    const wishlisted = await Wishlist.find(filter)
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .populate({ path: "post", populate: { path: "user", select: "username avatar" } })
      .lean();

    const posts = wishlisted.map((w) => w.post).filter(Boolean);
    const nextCursor = wishlisted.length > 0 ? wishlisted[wishlisted.length - 1]._id : null;

    return res.json({ posts, nextCursor });
  } catch (err) {
    console.error("Wishlist fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Save post ─────────────────────────────────────────────────────────────────
router.post("/", verifyToken, async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    await Wishlist.create({ post: postId, user: userId });

    const sessionId =
      req.headers["x-session-id"] || null;

    await onSaveAdded(postId);

    await trackEvent({
      user: userId,
      sessionId,
      eventType: "wishlist_add",
      targetType: "post",
      targetId: postId,
      source: "web",
    });

    // ✅ Gorse: save is the strongest positive signal
    fireAndForget(() =>
      insertFeedback({ feedbackType: "save", userId, postId })
    );

    res.json({ success: true });

  } catch (err) {
    if (err.code === 11000) return res.json({ message: "Already wishlisted" });
    res.status(500).json({ message: "Server error" });
  }
});

// ── Unsave post ───────────────────────────────────────────────────────────────
router.delete("/", verifyToken, async (req, res) => {
  const { postId } = req.body;
  const userId = req.user.id;

  await Wishlist.deleteOne({ post: postId, user: userId });

  const sessionId =
    req.headers["x-session-id"] || null;

  await onSaveRemoved(postId);

  await trackEvent({
    user: userId,
    sessionId,
    eventType: "wishlist_remove",
    targetType: "post",
    targetId: postId,
    source: "web",
  });

  // ✅ Gorse: remove save signal
  fireAndForget(() =>
    deleteFeedback({ feedbackType: "save", userId, postId })
  );

  res.json({ success: true });
});

export default router;