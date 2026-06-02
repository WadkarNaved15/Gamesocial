import mongoose from "mongoose";
import AllPost from "../models/Allposts.js";
import { markViewInRedis } from "../services/postViewRedis.js";
import { enqueuePostView } from "../services/postViewQueue.js";

const VALID_WATCH_TIME_MS = 3000;

export const trackPostView = async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      source = "other",
      deviceType = "other",
      watchTimeMs = 0,
    } = req.body;

    const viewerId = req.user?._id;

    if (!viewerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid postId" });
    }

    if (watchTimeMs < VALID_WATCH_TIME_MS) {
      return res.status(200).json({
        message: "View ignored because watch time was too short",
        counted: false,
      });
    }

    const post = await AllPost.findById(postId).select("_id user");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() === viewerId.toString()) {
      return res.status(200).json({
        message: "Owner views are ignored",
        counted: false,
        unique: false,
      });
    }

    const redisResult = await markViewInRedis({
      postId,
      viewerId,
    });

    if (!redisResult.countedThisTime) {
      return res.status(200).json({
        message: "View already counted recently",
        counted: false,
        unique: false,
      });
    }

    await enqueuePostView({
      postId,
      viewerId,
      source,
      deviceType,
      watchTimeMs,
      isUnique: redisResult.isUnique,
      viewedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      message: "View queued",
      counted: true,
      unique: redisResult.isUnique,
    });
  } catch (error) {
    console.error("trackPostView error:", error);
    return res.status(500).json({ message: "Failed to track view" });
  }
};