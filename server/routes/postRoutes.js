// routes/posts.js
// fetch_posts now delegates to feed.service.js for the merged feed.
// All other routes are unchanged from your original.

import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import Post from "../models/Allposts.js";
import Like from "../models/Like.js";
import Wishlist from "../models/Wishlist.js";
import optionalAuthMiddleware from "../middlewares/optionalAuthMiddleware.js";
import redisClient from "../config/redis.js";
import { getFeedPage } from "../services/feed.service.js";
import { trackPostView } from "../controllers/postView.controller.js";
import verifyToken from "../middlewares/authMiddleware.js";
import { enrichDemoConsumed } from "../utils/enrichDemoConsumed.js";
import { enrichSessionRequests } from "../utils/enrichSessionRequests.js";
import Follow from "../models/Follow.js"; // Adjust the path/name based on your actual schema
dotenv.config();

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ── GET /api/posts/fetch_posts ───────────────────────────────────────────────
// Merged feed: AllPost rows + PocketFeedEntry rows, cursor-paginated.
router.get("/fetch_posts", optionalAuthMiddleware, async (req, res) => {
  const { cursor, limit = 10 } = req.query;
  const userId = req.user?._id?.toString() || null;
  const cacheUserKey = userId ?? "guest";
  const isFirstPage = !cursor;

  // Only cache first page — cursor pages are unique, not worth caching
  const cacheKey = isFirstPage ? `feed:${cacheUserKey}:first` : null;

  if (cacheKey) {
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.status(200).json(JSON.parse(cached));

    // Stampede protection — only one request builds the cache
    const lockKey = `lock:${cacheKey}`;
    const lockAcquired = await redisClient.set(lockKey, "1", {
      NX: true,   // only set if not exists
      EX: 10,     // lock expires in 10s no matter what
    });

    if (!lockAcquired) {
      // Another request is building it — poll briefly then fall through
      await new Promise(r => setTimeout(r, 150));
      const cached2 = await redisClient.get(cacheKey);
      if (cached2) return res.status(200).json(JSON.parse(cached2));
    }
  }

  try {
    const { posts, nextCursor } = await getFeedPage({
      cursor: cursor || undefined,
      limit: Number(limit),
      userId,
    });

    const response = { posts, nextCursor };

    if (cacheKey) {
      const ttl = userId ? 45 : 180;
      await redisClient.setEx(cacheKey, ttl, JSON.stringify(response));
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ── GET /api/posts/filter_posts ──────────────────────────────────────────────
// Search via Meilisearch — pocket entries indexed separately if desired.
router.get("/filter_posts", optionalAuthMiddleware, async (req, res) => {
  try {
    const { query, cursor, limit = 10 } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const filter = {
      $text: { $search: query },
    };


    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const posts = await Post.find(
      filter,
      { score: { $meta: "textScore" } }
    )
      .populate("user", "username avatar")
      .sort({ score: { $meta: "textScore" }, _id: -1 })
      .limit(Number(limit))
      .lean();

    await enrichDemoConsumed(
      posts,
      req.user?._id?.toString()
    );

    await enrichSessionRequests(
      posts,
      req.user?._id?.toString()
    );

    const nextCursor =
      posts.length === Number(limit)
        ? posts[posts.length - 1]._id
        : null;

    res.status(200).json({
      posts,
      nextCursor,
    });
  } catch (error) {
    console.error("Error filtering posts:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/posts/user_posts/:userId ────────────────────────────────────────
// Profile page — AllPost only (pocket entries are brand-owned, not user posts).
router.get("/user_posts/:userId", optionalAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = 10 } = req.query;

    const query = {
      user: userId,
      ...(cursor && { _id: { $lt: cursor } }),
    };

    query.type =
      req.user?.role === "admin"
        ? { $ne: "canvas_article" }
        : { $nin: ["canvas_article"] };

    const posts = await Post.find(query)
      .populate("user", "username avatar")
      .sort({ _id: -1 })
      .limit(Number(limit))
      .lean();

    const viewerId = req.user?._id?.toString();

    if (viewerId && posts.length) {
      const postIds = posts.map((p) => p._id);

      const [userLikes, userWishlists] = await Promise.all([
        Like.find({
          user: viewerId,
          post: { $in: postIds },
        })
          .select("post")
          .lean(),

        Wishlist.find({
          user: viewerId,
          post: { $in: postIds },
        })
          .select("post")
          .lean(),
      ]);

      const likedSet = new Set(
        userLikes.map((l) => l.post.toString())
      );

      const wishlistSet = new Set(
        userWishlists.map((w) => w.post.toString())
      );

      for (const post of posts) {
        post.isLiked = likedSet.has(post._id.toString());
        post.isWishlisted = wishlistSet.has(post._id.toString());
      }
    }

    await enrichDemoConsumed(
      posts,
      req.user?._id?.toString()
    );

    await enrichSessionRequests(
      posts,
      req.user?._id?.toString()
    );

    res.status(200).json({
      posts,
      nextCursor: posts.length ? posts[posts.length - 1]._id : null,
    });
  } catch (err) {
    console.error("Error fetching user posts:", err);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
});

// ── GET /api/posts/:postId ────────────────────────────────────────────────────
router.get("/:postId", optionalAuthMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate("user", "username avatar displayName")
      .lean();

    if (!post) return res.status(404).json({ deleted: true });

    const viewerId = req.user?._id?.toString();

    // 1. Initialize isFollowing to false by default
    post.user.isFollowing = false;

    // 2. If a user is logged in, check if they follow the post author
    if (viewerId && post.user._id) {
      
      // OPTION A: If you use a separate 'Follow' collection (Most Common)
      const isFollowing = await Follow.exists({
        follower: viewerId,
        following: post.user._id
      });
      
      post.user.isFollowing = !!isFollowing;

      /* // OPTION B: If you store following as an array of ObjectIds in the User model:
      // import User from "../models/User.js";
      // const currentUser = await User.findById(viewerId).select("following").lean();
      // post.user.isFollowing = currentUser?.following?.some(id => id.toString() === post.user._id.toString()) || false;
      */
    }

    // (Optional) You might also want to check isLiked and isWishlisted here 
    // for the Post Detail view, just like you did in the user_posts route!

    if (post) {
      await enrichDemoConsumed(
        [post],
        viewerId
      );

      await enrichSessionRequests(
        [post],
        viewerId
      );
    }

    res.json(post);
  } catch (err) {
    console.error("Error fetching single post:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});


router.post("/:postId/view", verifyToken, trackPostView);

export default router;