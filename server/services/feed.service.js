// services/feed.service.js
//
// Strategy:
//   Logged-in user  → Gorse personalised IDs + pockets + like/wishlist — all parallel
//   Logged-out user → chronological AllPost + pockets — both parallel
//   Gorse timeout   → graceful fallback to chronological
//
// Cursor format:
//   "a:<objectId>"  — chronological allpost cursor
//   "p:<isoDate>"   — pocket cursor
//   "g:<offset>"    — Gorse offset cursor

import AllPost from "../models/Allposts.js";
import PocketFeedEntry from "../models/PocketFeedEntry.js";
import Like from "../models/Like.js";
import Wishlist from "../models/Wishlist.js";
import User from "../models/User.js";
import {
  getRecommendations,
  recordServed,
  fireAndForget,
} from "./gorse.client.js";
import DemoConsumption from "../models/DemoConsumption.js";
import { enrichDemoConsumed } from "../utils/enrichDemoConsumed.js";
import { enrichSessionRequests } from "../utils/enrichSessionRequests.js";
import redisClient from "../config/redis.js";

// Drop this low — if Gorse can't respond in 400ms, chronological is fine.
// A 2000ms timeout holds 200 VUs hostage for 2 full seconds each.
const GORSE_TIMEOUT_MS = 400;

// ── Gorse fetch with timeout ──────────────────────────────────────────────────

async function getGorsePostIds(userId, limit, offset) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gorse timeout")), GORSE_TIMEOUT_MS)
  );
  return Promise.race([getRecommendations({ userId, limit, offset }), timeout]);
}

// ── Shared projection — one place to update if schema changes ─────────────────

const POST_PROJECTION = {
  _id: 1,
  user: 1,
  description: 1,
  type: 1,
  viewsCount: 1,
  uniqueViewsCount: 1,
  likesCount: 1,
  commentsCount: 1,
  createdAt: 1,
  mentions: 1,
  hasInteractMention: 1,

  "modelPost.price": 1,
  "modelPost.assets.originalUrl": 1,
  "modelPost.assets.optimizedUrl": 1,
  "modelPost.assets.fieldOfView": 1,

  // GAME POST
  "gamePost.gameName": 1,
  "gamePost.price": 1,
  "gamePost.version": 1,
  "gamePost.videoDemo": 1,
  "gamePost.maxSessionDurationMinutes": 1,

  "gamePost.creditBudget.usedCredits": 1,
  "gamePost.creditBudget.remainingCredits": 1,

  "gamePost.gameMetrics.totalSessions": 1,
  "gamePost.gameMetrics.uniquePlayers": 1,
  "gamePost.gameMetrics.totalSessionTimeMs": 1,
  "gamePost.gameMetrics.sessionRequests": 1,
  "gamePost.isTestUpload": 1,

  "normalPost.assets": 1,

  "adModelPost.brandName": 1,
  "adModelPost.logoUrl": 1,
  "adModelPost.bgMode": 1,
  "adModelPost.bgColor": 1,
  "adModelPost.bgImageUrl": 1,
  "adModelPost.bgImagePosition": 1,
  "adModelPost.bgImageSize": 1,
  "adModelPost.overlayOpacity": 1,
  "adModelPost.ctaText": 1,
  "adModelPost.ctaLink": 1,
  "adModelPost.style.ctaColor": 1,
  "adModelPost.asset.originalUrl": 1,
  "adModelPost.asset.optimizedUrl": 1,
  "adModelPost.asset.optimization": 1,
  "adModelPost.asset.fieldOfView": 1,
};

// ── Chronological fetch (guest fallback + Gorse fallback) ─────────────────────

async function fetchPostsByIds(ids, isAdmin = false ,canViewTestUploads = false) {
  // Used by Gorse path & Cache hit path: fetch exact IDs, no sort (JS preserves rank)
  const filter = {
    _id: { $in: ids },
    type: { $ne: "canvas_article" },
  };

  if (!canViewTestUploads) {
    filter["gamePost.isTestUpload"] = { $ne: true };
}

  if (!isAdmin) {
    filter.type = {
      $nin: ["canvas_article"],
    };
  }


  const docs = await AllPost.find(filter)
    .select(POST_PROJECTION)
    .populate("user", "username avatar displayName")
    .populate("mentions.user", "username displayName avatar")
    .lean();

  return docs;
}

async function fetchChronological(filter, limit, isAdmin = false , canViewTestUploads = false) {
  // Used by guest/fallback path: sort by _id desc
  if (!canViewTestUploads) {
    filter["gamePost.isTestUpload"] = { $ne: true };
}
  const query = {
    ...filter,
  };

  query.type = !isAdmin
    ? { $nin: ["canvas_article"] }
    : { $ne: "canvas_article" };

    
  

  return AllPost.find(query)
    .select(POST_PROJECTION)
    .populate("user", "username avatar displayName")
    .populate("mentions.user", "username displayName avatar")
    .sort({ _id: -1 })
    .limit(limit)
    .lean();
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * @param {{ cursor?: string, limit?: number, userId?: string|null }} opts
 */
export async function getFeedPage({ cursor, limit = 10, userId } = {}) {
  let isAdmin = false;
  let canViewTestUploads = false;

  if (userId) {
    const user = await User.findById(userId)
  .select("role isGameTester")
  .lean();

 canViewTestUploads =
  user?.role === "admin" ||
  user?.isGameTester === true;
    isAdmin = user?.role === "admin";
  }
  
  const fetchLimit = limit + 3;
  const isFirstPage = !cursor;
  
  // ── Cache configuration ───────────────────────────────────────────────────────
  const cacheUserKey = userId ?? "guest";
  const cacheKey = isFirstPage ? `feed:${cacheUserKey}:first` : null;
  let cachedData = null;
  

  // ── Cache Lookup & Stampede Protection ────────────────────────────────────────
  if (cacheKey) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        cachedData = JSON.parse(cached);
      } else {
        const lockKey = `lock:${cacheKey}`;
        const lockAcquired = await redisClient.set(lockKey, "1", {
          NX: true,
          EX: 10,
        });
        await redisClient.del(lockKey);

        if (!lockAcquired) {
          // Another request is building the cache — poll briefly
          await new Promise((r) => setTimeout(r, 150));
          const cached2 = await redisClient.get(cacheKey);
          if (cached2) {
            cachedData = JSON.parse(cached2);
          }
        }
      }
    } catch (err) {
      console.error("[Feed] Redis cache error:", err);
      cachedData = null; // Fall through to standard logic if Redis fails
    }
  }

  let merged = [];
  let nextCursor = null;

  if (cachedData) {
    // ========================================================================
    // CACHE HIT PATH
    // ========================================================================
    const { ids, nextCursor: cachedNextCursor } = cachedData;
    nextCursor = cachedNextCursor;

    if (ids && ids.length > 0) {
      // Fetch fresh posts directly from Mongo using cached IDs
      const docs = await fetchPostsByIds(ids, isAdmin , canViewTestUploads);

      // Preserve Gorse's original ranked order (or chronological if guest)
      const postMap = new Map(docs.map((p) => [p._id.toString(), p]));
      merged = ids.map((id) => postMap.get(id)).filter(Boolean);

      // Fire-and-forget impression recording for logged-in users
      if (userId) {
        fireAndForget(() => recordServed(userId, ids));
      }
    }
  } else {
    // ========================================================================
    // CACHE MISS PATH (Execute Recommendations / Chronological logic)
    // ========================================================================
    let allPostFilter = {};
    let gorseOffset = 0;

    if (cursor) {
      const [type, value] = cursor.split(/:(.+)/);
      if (type === "a") {
        allPostFilter = { _id: { $lt: value } };
      } else if (type === "g") {
        gorseOffset = parseInt(value, 10) || 0;
      } else {
        allPostFilter = { _id: { $lt: cursor } };
      }
    }

    let allPosts = [];
    let usedGorse = false;

    if (userId) {
      // ── Logged-in: Gorse path ──────────────────────────────
      let gorseIds = [];
      try {
        const [ids] = await Promise.all([
          getGorsePostIds(userId, fetchLimit, gorseOffset),
        ]);
        gorseIds = ids ?? [];
      } catch (err) {
        console.warn("[Feed] Gorse unavailable, falling back:", err.message);
      }

      if (gorseIds.length > 0) {
        const safeIds = [...new Set(gorseIds)].filter((id) => id?.length === 24);
        if (safeIds.length > 0) {
          const docs = await fetchPostsByIds(safeIds, isAdmin , canViewTestUploads);
          const postMap = new Map(docs.map((p) => [p._id.toString(), p]));
          allPosts = safeIds.map((id) => postMap.get(id)).filter(Boolean);
          usedGorse = true;

          const servedIds = allPosts.map((p) => p._id.toString());
          fireAndForget(() => recordServed(userId, servedIds));
        }
      }

      if (!usedGorse) {
        allPosts = await fetchChronological(allPostFilter, fetchLimit, isAdmin , canViewTestUploads);
      }
    } else {
      // ── Guest: Chronological path ──────────────────────────
      [allPosts] = await Promise.all([
        fetchChronological(allPostFilter, fetchLimit, isAdmin , canViewTestUploads),
      ]);
    }

    // ── Normalise to common shape for sorting ───────────────
    const normalisedAllPosts = allPosts.map((p, idx) => ({
      ...p,
      _sortKey: usedGorse
        ? Date.now() - idx * 1000
        : p._id.getTimestamp().getTime(),
      _cursorType: usedGorse ? "g" : "a",
      _cursorVal: usedGorse
        ? String(gorseOffset + fetchLimit)
        : p._id.toString(),
    }));

    // ── Sort and slice ──────────────────────────────────────
    merged = [...normalisedAllPosts]
      .sort((a, b) => b._sortKey - a._sortKey)
      .slice(0, limit);

    if (merged.length > 0) {
      const last = merged[merged.length - 1];
      nextCursor = `${last._cursorType}:${last._cursorVal}`;

      // ── Write Cache Result (Only ordered IDs + Cursor) ───
      if (cacheKey) {
        const idsToCache = merged.map((p) => p._id.toString());
        const cachePayload = { ids: idsToCache, nextCursor };
        const ttl = 180; // 3 minutes

        redisClient.setEx(cacheKey, ttl, JSON.stringify(cachePayload)).catch((err) => {
          console.error("[Feed] Redis cache write failed:", err);
        });
      }
    }
  }

  // ========================================================================
  // COMMON POST-PROCESSING & ENRICHMENTS (Runs on BOTH Hits & Misses)
  // ========================================================================
  
  if (merged.length === 0) {
    return { posts: [], nextCursor: null };
  }

  // Trim model assets to first only
  for (const post of merged) {
    if (post.modelPost?.assets?.length > 1) {
      post.modelPost.assets = [post.modelPost.assets[0]];
    }
  }

  // Enrich isLiked / isWishlisted (logged-in only)
  if (userId) {
    const allPostIds = merged
      .filter((p) => p.type !== "pocket_update")
      .map((p) => p._id);

    if (allPostIds.length) {
      const [userLikes, userWishlists] = await Promise.all([
        Like.find({ user: userId, post: { $in: allPostIds } })
          .select("post")
          .lean(),
        Wishlist.find({ user: userId, post: { $in: allPostIds } })
          .select("post")
          .lean(),
      ]);

      const likedSet = new Set(userLikes.map((l) => l.post.toString()));
      const wishlistSet = new Set(userWishlists.map((w) => w.post.toString()));

      for (const p of merged) {
        if (p.type !== "pocket_update") {
          p.isLiked = likedSet.has(p._id.toString());
          p.isWishlisted = wishlistSet.has(p._id.toString());
        }
      }
    }
  }

  await Promise.all([
    enrichDemoConsumed(merged, userId),
    enrichSessionRequests(merged, userId),
  ]);

  // Strip temporary properties (if they exist from the miss path) before returning
  const posts = merged.map(({ _sortKey, _cursorType, _cursorVal, ...rest }) => rest);
  
  return { posts, nextCursor };
}