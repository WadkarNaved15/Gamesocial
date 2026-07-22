// routes/comment.js — Gorse feedback hook on comment creation only
// Only the POST route changes. GET and DELETE are unchanged.
import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import Comment from "../models/Comment.js";
import AllPost from "../models/Allposts.js";
import { sendEventToQueue } from "../utils/sendEventToQueue.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { insertFeedback, fireAndForget } from "../services/gorse.client.js";
import DemoConsumption from "../models/DemoConsumption.js";
import PostAnalytics from "../models/postAnalytics.js";
import {
  createComment,
  getComments,
  deleteComment,
  getReplies
} from "../controllers/comment.controller.js";
import {
  onCommentAdded,
  onCommentRemoved,
} from "../services/analyticsEvents.js";
import { parseMentions } from "../utils/mentions.js";

const router = express.Router();

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many comments. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Add comment ───────────────────────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  commentLimiter,
  createComment
);

// ── Get comments 
router.get("/", getComments);

// ─── Update comment 
router.get(
  "/:commentId/replies",
  getReplies
);

// ── Delete comment 
router.delete(
  "/:id",
  authMiddleware,
  deleteComment
);

export default router;