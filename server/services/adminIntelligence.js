// services/adminIntelligenceService.js
//
// Source-of-truth mapping (enforced):
//   AllPost.viewsCount / uniqueViewsCount  → totalViews, uniqueViews, top posts, top games, creator views, ad impressions
//   Like collection                        → all like counts and growth
//   Comment collection                     → all comment counts and growth
//   UserSession                            → DAU / WAU / MAU, retention, all active-user counts
//   GameSession                            → gaming metrics only
//   UserActivityEvent                      → profile views, search, shares, ad_click, content_view (detail-page opens only)

import mongoose from "mongoose";
import AllPost           from "../models/Allposts.js";
import User              from "../models/User.js";
import GameSession       from "../models/GameSession.js";
import UserActivityEvent from "../models/UserActivityEvent.js";
import UserSession       from "../models/UserSession.js";
import Like              from "../models/Like.js";
import Comment           from "../models/Comment.js";
import CacheService      from "./cacheService.js";
import { parseDateRange } from "../utils/dateRange.js";
import PostAnalytics from "../models/postAnalytics.js";
import CreditAudit from "../models/CreditAudit.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_EVENT_TYPES = [
  "page_view",
  "content_view",
  "profile_page_view",
  "search",
  "game_launch",
];

const AD_TARGET_TYPES = ["ad_model_post", "media_ad_post"];

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/**
 * Count distinct users with at least one UserSession started in the given window.
 * UserSession is the authoritative source for DAU/WAU/MAU per spec.
 */
async function countActiveUsers(sessionFilter) {
  const result = await UserSession.aggregate([
    { $match: sessionFilter },
    { $group: { _id: "$user" } },
    { $count: "n" },
  ]);
  return result[0]?.n ?? 0;
}

function pickDateFormat(spanDays) {
  if (spanDays <= 2)   return "%Y-%m-%dT%H:00:00";
  if (spanDays <= 90)  return "%Y-%m-%d";
  if (spanDays <= 366) return "%G-W%V";
  return "%Y-%m";
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export async function getOverview(query = {}) {
  const { dateMatch, label } = parseDateRange(query);
  const cacheKey = `intel:overview:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const now = new Date();

  const dStart      = new Date(now); dStart.setHours(0, 0, 0, 0);
  const wStart      = new Date(now); wStart.setDate(wStart.getDate() - 6);  wStart.setHours(0, 0, 0, 0);
  const mStart      = new Date(now); mStart.setDate(mStart.getDate() - 29); mStart.setHours(0, 0, 0, 0);
  const prev30Start = new Date(mStart); prev30Start.setDate(prev30Start.getDate() - 30);

  const [
    userStats,
    dauCount,
    wauCount,
    mauCount,
    // FIX: retention now uses UserSession instead of UserActivityEvent
    retentionStat,

    allPostStats,
    likesInRange,
    commentsInRange,
    typeBreakdown,
    likesTypeBreakdown,
    commentsTypeBreakdown,
    sharesTypeBreakdown,

    gameStats,
    sessionStats,

    websiteStats,
    deviceStats,
    browserStats,
    osStats,

    adImpressionStats,
    adClickStats,
    searchMetrics,
    gameConversion,
    healthStats,
    sharesInRange,
     creditConsumptionStats,
  ] = await Promise.all([

    // ── User model counts ──────────────────────────────────────────────────
    User.aggregate([
      {
        $facet: {
          total:          [{ $count: "n" }],
          new:            [{ $match: { ...dateMatch } }, { $count: "n" }],
          verified:       [{ $match: { ...dateMatch, isVerified: true } }, { $count: "n" }],
          pocketEligible: [{ $match: { ...dateMatch, isPocketEligible: true } }, { $count: "n" }],
        },
      },
    ]),

    // ── DAU / WAU / MAU — UserSession is authoritative ────────────────────
    countActiveUsers({ startedAt: { $gte: dStart } }),
    countActiveUsers({ startedAt: { $gte: wStart } }),
    countActiveUsers({ startedAt: { $gte: mStart } }),

    // ── FIX: Retention uses UserSession (not UserActivityEvent) ───────────
    // A "retained" user is one who had a session in both the previous 30d and current 30d.
    (async () => {
      const [prev, curr] = await Promise.all([
        UserSession.distinct("user", { startedAt: { $gte: prev30Start, $lt: mStart } }),
        UserSession.distinct("user", { startedAt: { $gte: mStart } }),
      ]);
      const prevSet  = new Set(prev.map(String));
      const retained = curr.filter(u => prevSet.has(String(u))).length;
      return prev.length > 0
        ? ((retained / prev.length) * 100).toFixed(1)
        : "0.0";
    })(),

    // ── totalViews / totalUniqueViews from AllPost ─────────────────────────
    AllPost.aggregate([
      { $match: { ...dateMatch } },
      {
        $group: {
          _id:              null,
          totalViews:       { $sum: "$viewsCount" },
          totalUniqueViews: { $sum: "$uniqueViewsCount" },
        },
      },
    ]),

    // ── Likes / Comments from authoritative collections ───────────────────
    Like.countDocuments({ ...dateMatch }),
    Comment.countDocuments({ ...dateMatch }),

    // Shared type breakdown from postAnalytics
      PostAnalytics.aggregate([
  {
    $lookup: {
      from: "allposts",
      localField: "post",
      foreignField: "_id",
      as: "postDoc",
      pipeline: [{ $project: { type: 1 } }],
    },
  },
  {
    $addFields: {
      postType: {
        $arrayElemAt: ["$postDoc.type", 0],
      },
    },
  },
  {
    $group: {
      _id: "$postType",
      shares: {
        $sum: "$lifetime.shares",
      },
    },
  },
]),

    // ── Content type breakdown (view/post counts) from AllPost ────────────
    // Note: views are from AllPost (correct); likes/comments in this breakdown
    // are display-only denormalized values, not used in platform-level calculations.
    AllPost.aggregate([
      { $match: { ...dateMatch } },
      {
        $group: {
          _id:   "$type",
          count: { $sum: 1 },
          views: { $sum: "$viewsCount" },
          // Collect post IDs per type for authoritative like/comment counts below
          postIds: { $push: "$_id" },
        },
      },
    ]),

    // ── FIX: Likes per content type from Like collection ──────────────────
    Like.aggregate([
      { $match: { ...dateMatch } },
      {
        $lookup: {
          from:         "allposts",
          localField:   "post",
          foreignField: "_id",
          as:           "postDoc",
          pipeline:     [{ $project: { type: 1 } }],
        },
      },
      { $addFields: { postType: { $arrayElemAt: ["$postDoc.type", 0] } } },
      { $group: { _id: "$postType", count: { $sum: 1 } } },
    ]),

    // ── FIX: Comments per content type from Comment collection ────────────
    Comment.aggregate([
      { $match: { ...dateMatch } },
      {
        $lookup: {
          from:         "allposts",
          localField:   "post",
          foreignField: "_id",
          as:           "postDoc",
          pipeline:     [{ $project: { type: 1 } }],
        },
      },
      { $addFields: { postType: { $arrayElemAt: ["$postDoc.type", 0] } } },
      { $group: { _id: "$postType", count: { $sum: 1 } } },
    ]),

    // ── Game catalog stats (AllPost) ───────────────────────────────────────
    AllPost.aggregate([
      { $match: { type: "game_post" } },
      {
        $facet: {
          total:     [{ $count: "n" }],
          created:   [{ $match: { ...dateMatch } }, { $count: "n" }],
          verified:  [{ $match: { "gamePost.verification.status": "verified"  } }, { $count: "n" }],
          pending:   [{ $match: { "gamePost.verification.status": "pending"   } }, { $count: "n" }],
          failed:    [{ $match: { "gamePost.verification.status": "failed"    } }, { $count: "n" }],
          hidden:    [{ $match: { "gamePost.visibility": "hidden"             } }, { $count: "n" }],
          exhausted: [{ $match: { "gamePost.creditBudget.status": "exhausted" } }, { $count: "n" }],
          credits:   [{ $group: { _id: null, total: { $sum: "$gamePost.creditBudget.usedCredits" } } }],
        },
      },
    ]),

    // ── Gaming session stats (GameSession — authoritative) ─────────────────
    GameSession.aggregate([
      { $match: { ...dateMatch } },
      {
        $group: {
          _id:           null,
          total:         { $sum: 1 },
          completed:     { $sum: { $cond: [{ $eq: ["$status", "ended"]  }, 1, 0] } },
          failed:        { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          totalCredits: { $sum: "$billing.creditsConsumed" },
          totalPlayTime: { $sum: "$metrics.totalPlayTime" },
          uniquePlayers: { $addToSet: "$user" },
          avgDuration: {
            $avg: {
              $cond: [
                { $and: ["$startedAt", "$endedAt"] },
                { $subtract: ["$endedAt", "$startedAt"] },
                null,
              ],
            },
          },
        },
      },
    ]),

    // ── Website analytics (UserSession ) ───────────────
    UserSession.aggregate([
  {
    $match: {
      startedAt: {
        $gte:
          dateMatch.createdAt?.$gte ??
          new Date(0),

        $lte:
          dateMatch.createdAt?.$lte ??
          new Date(),
      },
    },
  },
  {
    $group: {
      _id: null,

      totalSessions: {
        $sum: 1,
      },

      activeSessions: {
        $sum: {
          $cond: [
            {
              $eq: [
                "$endedAt",
                null,
              ],
            },
            1,
            0,
          ],
        },
      },

      avgSessionDuration: {
        $avg: "$durationMs",
      },

      avgActiveTime: {
        $avg: "$activeTimeMs",
      },

      avgPagesPerSession: {
        $avg: "$pageViews",
      },

      avgActionsPerSession: {
        $avg: "$actions",
      },

      bounceSessions: {
        $sum: {
          $cond: [
            "$isBounce",
            1,
            0,
          ],
        },
      },
    },
  },
]),

UserSession.aggregate([
  {
    $match: {
      startedAt: {
        $gte:
          dateMatch.createdAt?.$gte ??
          new Date(0),

        $lte:
          dateMatch.createdAt?.$lte ??
          new Date(),
      },
    },
  },
  {
    $group: {
      _id: "$deviceType",
      count: {
        $sum: 1,
      },
    },
  },
]),

UserSession.aggregate([
  {
    $match: {
      startedAt: {
        $gte:
          dateMatch.createdAt?.$gte ??
          new Date(0),

        $lte:
          dateMatch.createdAt?.$lte ??
          new Date(),
      },
    },
  },
  {
    $group: {
      _id: "$browser",
      sessions: {
        $sum: 1,
      },
    },
  },
  {
    $sort: {
      sessions: -1,
    },
  },
]),

UserSession.aggregate([
  {
    $match: {
      startedAt: {
        $gte:
          dateMatch.createdAt?.$gte ??
          new Date(0),

        $lte:
          dateMatch.createdAt?.$lte ??
          new Date(),
      },
    },
  },
  {
    $group: {
      _id: "$operatingSystem",
      sessions: {
        $sum: 1,
      },
    },
  },
  {
    $sort: {
      sessions: -1,
    },
  },
]),

    // ── Ad impressions / uniqueViews from AllPost ──────────────────────────
    AllPost.aggregate([
      { $match: { type: { $in: AD_TARGET_TYPES }, ...dateMatch } },
      {
        $group: {
          _id:        "$type",
          views:      { $sum: "$viewsCount" },
          uniqueViews:{ $sum: "$uniqueViewsCount" },
          count:      { $sum: 1 },
        },
      },
    ]),

    // ── Ad clicks from UserActivityEvent (behavioral) ──────────────────────
    UserActivityEvent.aggregate([
      { $match: { eventType: "ad_click", ...dateMatch } },
      { $count: "n" },
    ]),

    // ── Search metrics (UserActivityEvent) ────────────────────────────────
    UserActivityEvent.aggregate([
      { $match: { ...dateMatch } },
      {
        $facet: {
          searches:     [{ $match: { eventType: "search"       } }, { $count: "n" }],
          searchClicks: [{ $match: { eventType: "search_click" } }, { $count: "n" }],
        },
      },
    ]),

    // ── Game detail-page opens → launches (UserActivityEvent) ─────────────
    UserActivityEvent.aggregate([
      { $match: { ...dateMatch } },
      {
        $facet: {
          gameViews:    [{ $match: { eventType: "content_view", targetType: "game_post" } }, { $count: "n" }],
          gameLaunches: [{ $match: { eventType: "game_launch"                           } }, { $count: "n" }],
        },
      },
    ]),

    // ── Platform health (GameSession — authoritative) ──────────────────────
    GameSession.aggregate([
      { $match: { ...dateMatch } },
      {
        $group: {
          _id:          null,
          total:        { $sum: 1 },
          failed:       { $sum: { $cond: [{ $eq: ["$status",     "failed"]                             }, 1, 0] } },
          crashed:      { $sum: { $cond: [{ $eq: ["$exitReason", "crash"]                              }, 1, 0] } },
          disconnected: { $sum: { $cond: [{ $eq: ["$exitReason", "disconnect"]                         }, 1, 0] } },
          abandoned:    { $sum: { $cond: [{ $in: ["$exitReason", ["user_abandoned","stale_abandoned"]] }, 1, 0] } },
          ended:        { $sum: { $cond: [{ $eq: ["$status",     "ended"]                              }, 1, 0] } },
          avgQueue: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ["$queueType", "queued"] }, "$startedAt"] },
                { $subtract: ["$startedAt", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
    ]),

    // ── Shares (PostAnalytics — authoritative) ────────────────────────────
    PostAnalytics.aggregate([
  {
    $unwind: "$dailyStats",
  },
  {
    $match: {
      ...(dateMatch.createdAt?.$gte && {
        "dailyStats.date": {
          $gte: dateMatch.createdAt.$gte
            .toISOString()
            .slice(0, 10),
        },
      }),
      ...(dateMatch.createdAt?.$lte && {
        "dailyStats.date": {
          $lte: dateMatch.createdAt.$lte
            .toISOString()
            .slice(0, 10),
        },
      }),
    },
  },
  {
    $group: {
      _id: null,
      shares: {
        $sum: "$dailyStats.shares",
      },
    },
  },
]),

    CreditAudit.aggregate([
    {
      $match: {
        action: "consumption",
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: null,
        totalCreditsConsumed: {
          $sum: "$credits",
        },
      },
    },
  ]),
  ]);

  // ── Unpack user stats ──────────────────────────────────────────────────────
  const uTotal    = userStats[0]?.total[0]?.n         ?? 0;
  const uNew      = userStats[0]?.new[0]?.n            ?? 0;
  const uVerified = userStats[0]?.verified[0]?.n       ?? 0;
  const uPocket   = userStats[0]?.pocketEligible[0]?.n ?? 0;

  // ── Unpack AllPost view counts ─────────────────────────────────────────────
  const postViewStats    = allPostStats[0] ?? {};
  const totalViews       = postViewStats.totalViews       ?? 0;
  const totalUniqueViews = postViewStats.totalUniqueViews ?? 0;

  const totalLikes    = likesInRange;
  const totalComments = commentsInRange;
  const shares = sharesInRange[0]?.shares ?? 0;

  // Engagement rate: (likes + comments + shares) / totalUniqueViews * 100
  const engagements    = totalLikes + totalComments + shares;
  const engagementRate = totalUniqueViews > 0
    ? parseFloat(((engagements / totalUniqueViews) * 100).toFixed(2))
    : 0;

  const [totalPostsResult, newPosts] = await Promise.all([
    AllPost.countDocuments({}),
    AllPost.countDocuments({ ...dateMatch }),
  ]);

  const avgEngagementPerPost = newPosts > 0
    ? (engagements / newPosts).toFixed(1)
    : "0";

    
  // ── FIX: Build type breakdown with authoritative like/comment/shares counts ───────
  const likesByType    = new Map(likesTypeBreakdown.map(x => [x._id, x.count]));
  const commentsByType = new Map(commentsTypeBreakdown.map(x => [x._id, x.count]));
  const sharesByType = new Map(
  sharesTypeBreakdown.map(x => [x._id, x.shares])
);


  const tb = {};
  for (const t of typeBreakdown) {
    tb[t._id] = {
      count:    t.count,
      views:    t.views,
      // FIX: likes and comments from Like/Comment collections, not AllPost counters
      likes:    likesByType.get(t._id)    ?? 0,
      comments: commentsByType.get(t._id) ?? 0,
      shares:   sharesByType.get(t._id)   ?? 0,
    };
  }

  // ── Unpack game catalog ───────────────────────────────────────────────────
  const g = gameStats[0] ?? {};

  // ── Unpack session stats ──────────────────────────────────────────────────
  const s          = sessionStats[0] ?? {};
  const sTotal     = s.total     ?? 0;
  const sFailed    = s.failed    ?? 0;
  const sCompleted = s.completed ?? 0;
  const sFailRate  = sTotal > 0 ? (sFailed / sTotal) * 100 : 0;

  // ── Unpack ad impressions from AllPost ────────────────────────────────────
  const mediaAdRow    = adImpressionStats.find(r => r._id === "media_ad_post") ?? {};
  const adModelRow    = adImpressionStats.find(r => r._id === "ad_model_post") ?? {};
  const adImpressions    = mediaAdRow.views       ?? 0;
  const adUniqueImpressions = mediaAdRow.uniqueViews ?? 0; // exposed in result
  const adModelViews  = adModelRow.views          ?? 0;
  const mediaAdCount  = mediaAdRow.count          ?? 0;
  const adModelCount  = adModelRow.count          ?? 0;
  const adClicks      = adClickStats[0]?.n        ?? 0;
  const adCtr         = adImpressions > 0
    ? parseFloat(((adClicks / adImpressions) * 100).toFixed(2))
    : 0;

  // ── Unpack search ─────────────────────────────────────────────────────────
  const sm           = searchMetrics[0] ?? {};
  const searches     = sm.searches?.[0]?.n     ?? 0;
  const searchClicks = sm.searchClicks?.[0]?.n ?? 0;
  const searchCtr    = searches > 0
    ? parseFloat(((searchClicks / searches) * 100).toFixed(2))
    : 0;

  // ── Unpack game conversion ────────────────────────────────────────────────
  const gc              = gameConversion[0] ?? {};
  const gameDetailOpens = gc.gameViews?.[0]?.n    ?? 0;
  const gameLaunches    = gc.gameLaunches?.[0]?.n ?? 0;
  const gameConvRate    = gameDetailOpens > 0
    ? parseFloat(((gameLaunches / gameDetailOpens) * 100).toFixed(2))
    : 0;

  // ── Unpack health ─────────────────────────────────────────────────────────
  const h      = healthStats[0] ?? {};
  const hTotal = h.total ?? 0;
  const rate   = field => hTotal > 0 ? ((h[field] ?? 0) / hTotal) * 100 : 0;

  const ws = websiteStats[0] ?? {};

const totalSessions =
  ws.totalSessions ?? 0;

const activeSessions =
  ws.activeSessions ?? 0;

const avgSessionDuration =
  Math.round(
    ws.avgSessionDuration ?? 0
  );

const avgActiveTime =
  Math.round(
    ws.avgActiveTime ?? 0
  );

const avgPagesPerSession =
  Number(
    (
      ws.avgPagesPerSession ?? 0
    ).toFixed(2)
  );

const avgActionsPerSession =
  Number(
    (
      ws.avgActionsPerSession ?? 0
    ).toFixed(2)
  );

const bounceRate =
  totalSessions > 0
    ? Number(
        (
          (ws.bounceSessions /
            totalSessions) *
          100
        ).toFixed(2)
      )
    : 0;

const devices = {
  desktop: 0,
  mobile: 0,
  tablet: 0,
  unknown: 0,
};

deviceStats.forEach((d) => {
  devices[d._id] = d.count;
});

  const result = {
    rangeLabel: label,

    users: {
      total:          uTotal,
      newUsers:       uNew,
      verified:       uVerified,
      pocketEligible: uPocket,
      dau:            dauCount,
      wau:            wauCount,
      mau:            mauCount,
      followerGrowth: 0,
      activeUsers:    mauCount,
      retentionRate:  retentionStat,
    },

    content: {
      totalPosts:           totalPostsResult,
      createdPosts:         newPosts,
      totalViews,
      totalUniqueViews,
      totalLikes,
      totalComments,
      totalShares:          shares,
      engagementRate,
      avgEngagementPerPost,
      typeBreakdown:        tb,
    },

    website: {
      totalSessions,
      activeSessions,
      avgSessionDuration,
      avgActiveTime,
      avgPagesPerSession,
      avgActionsPerSession,
      bounceRate,
    },

    devices,

browsers: browserStats.map(
  (b) => ({
    browser:
      b._id || "Unknown",
    sessions:
      b.sessions,
  })
),

operatingSystems:
  osStats.map((o) => ({
    os:
      o._id || "Unknown",
    sessions:
      o.sessions,
  })),

    games: {
      total:            g.total?.[0]?.n       ?? 0,
      created:          g.created?.[0]?.n     ?? 0,
      verified:         g.verified?.[0]?.n    ?? 0,
      pending:          g.pending?.[0]?.n     ?? 0,
      failed:           g.failed?.[0]?.n      ?? 0,
      hidden:           g.hidden?.[0]?.n      ?? 0,
      exhausted:        g.exhausted?.[0]?.n   ?? 0,
      totalCreditsUsed: g.credits?.[0]?.total ?? 0,
      gameViews:        gameDetailOpens,
      launches:         gameLaunches,
      conversionRate:   gameConvRate,
    },

    sessions: {
      total:              sTotal,
      completed:          sCompleted,
      failed:             sFailed,
      uniquePlayers:      s.uniquePlayers?.length ?? 0,
      totalCredits:       s.totalCredits          ?? 0,
      totalPlayTime:      s.totalPlayTime         ?? 0,
      avgSessionDuration: Math.round(s.avgDuration ?? 0),
      successRate:        parseFloat((100 - sFailRate).toFixed(2)),
      failureRate:        parseFloat(sFailRate.toFixed(2)),
    },

    advertising: {
      impressions:         adImpressions,
      uniqueImpressions:   adUniqueImpressions,   // FIX: was computed but never returned
      clicks:              adClicks,
      ctr:                 adCtr,
      adModelViews,
      mediaAdCount,
      adModelCount,
      topBrands: [],
    },

    search: {
      searches,
      searchClicks,
      ctr: searchCtr,
    },

    health: {
      failureRate:        parseFloat(rate("failed").toFixed(2)),
      crashRate:          parseFloat(rate("crashed").toFixed(2)),
      disconnectRate:     parseFloat(rate("disconnected").toFixed(2)),
      abandonRate:        parseFloat(rate("abandoned").toFixed(2)),
      sessionSuccessRate: parseFloat((hTotal > 0 ? (h.ended ?? 0) / hTotal * 100 : 100).toFixed(2)),
      avgQueueTimeMs:     Math.round(h.avgQueue ?? 0),
    },
  };

  await CacheService.set(cacheKey, result, 15);
  return result;
}

// ─── Growth ───────────────────────────────────────────────────────────────────

export async function getGrowth(query = {}) {
  const { dateMatch, start } = parseDateRange(query);
  const now      = new Date();
  const spanMs   = start ? now - start : 30 * 86_400_000;
  const spanDays = spanMs / 86_400_000;
  const fmt      = pickDateFormat(spanDays);

  const cacheKey = `intel:growth:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  

const [
  userGrowth,
  postViewsGrowth,
  sessionGrowth,
  likesGrowth,
  commentsGrowth,
  sharesGrowth,
  profileViewsGrowth,
  gamelaunchGrowth,
  creditConsumptionGrowth,
] = await Promise.all([
   User.aggregate([
  {
    $match: {
      ...dateMatch,
    },
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: fmt,
          date: "$createdAt",
        },
      },
      users: { $sum: 1 },
    },
  },
  { $sort: { _id: 1 } },
  {
    $project: {
      _id: 0,
      date: "$_id",
      users: 1,
    },
  },
]),

  PostAnalytics.aggregate([
    {
      $project: {
        dailyStats: 1,
      },
    },
    {
      $unwind: "$dailyStats",
    },
    {
      $match: {
        ...(dateMatch.createdAt?.$gte && {
          "dailyStats.date": {
            $gte: dateMatch.createdAt.$gte
              .toISOString()
              .slice(0, 10),
          },
        }),
        ...(dateMatch.createdAt?.$lte && {
          "dailyStats.date": {
            ...(dateMatch.createdAt?.$gte && {
              $gte: dateMatch.createdAt.$gte
                .toISOString()
                .slice(0, 10),
            }),
            $lte: dateMatch.createdAt.$lte
              .toISOString()
              .slice(0, 10),
          },
        }),
      },
    },
    {
      $group: {
        _id: "$dailyStats.date",

        views: {
          $sum: "$dailyStats.views",
        },

        uniqueViews: {
          $sum: "$dailyStats.uniqueViews",
        },

        watchTimeMs: {
          $sum: "$dailyStats.watchTimeMs",
        },

        demoConsumptions: {
          $sum: "$dailyStats.demoConsumptions",
        },

        sessions: {
          $sum: "$dailyStats.sessions",
        },

        uniquePlayers: {
          $sum: "$dailyStats.uniquePlayers",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        views: 1,
        uniqueViews: 1,
        watchTimeMs: 1,
        demoConsumptions: 1,
        sessions: 1,
        uniquePlayers: 1,
      },
    },
  ]),

  GameSession.aggregate([
  {
    $match: {
      ...(dateMatch.createdAt
        ? { startedAt: dateMatch.createdAt }
        : {}),
    },
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: fmt,
          date: "$startedAt",
        },
      },
      sessions: { $sum: 1 },
      uniqueUsers: { $addToSet: "$user" },
    },
  },
  {
    $sort: {
      _id: 1,
    },
  },
  {
    $project: {
      _id: 0,
      date: "$_id",
      sessions: 1,
      activeUsers: {
        $size: "$uniqueUsers",
      },
    },
  },
]),

  Like.aggregate([
    { $match: { ...dateMatch } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: fmt,
            date: "$createdAt",
          },
        },
        likes: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        likes: 1,
      },
    },
  ]),

  Comment.aggregate([
    { $match: { ...dateMatch } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: fmt,
            date: "$createdAt",
          },
        },
        comments: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        comments: 1,
      },
    },
  ]),

  // SHARES FROM POSTANALYTICS DAILY STATS
  PostAnalytics.aggregate([
    {
      $project: {
        dailyStats: 1,
      },
    },
    {
      $unwind: "$dailyStats",
    },
    {
      $match: {
        ...(dateMatch.createdAt?.$gte && {
          "dailyStats.date": {
            $gte: dateMatch.createdAt.$gte
              .toISOString()
              .slice(0, 10),
          },
        }),
        ...(dateMatch.createdAt?.$lte && {
          "dailyStats.date": {
            ...(dateMatch.createdAt?.$gte && {
              $gte: dateMatch.createdAt.$gte
                .toISOString()
                .slice(0, 10),
            }),
            $lte: dateMatch.createdAt.$lte
              .toISOString()
              .slice(0, 10),
          },
        }),
      },
    },
    {
      $group: {
        _id: "$dailyStats.date",
        shares: {
          $sum: "$dailyStats.shares",
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        shares: 1,
      },
    },
  ]),

  UserActivityEvent.aggregate([
    {
      $match: {
        eventType: "profile_page_view",
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: fmt,
            date: "$createdAt",
          },
        },
        profileViews: {
          $sum: 1,
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        profileViews: 1,
      },
    },
  ]),

  UserActivityEvent.aggregate([
    {
      $match: {
        eventType: "game_launch",
        ...dateMatch,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: fmt,
            date: "$createdAt",
          },
        },
        gameLaunches: {
          $sum: 1,
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        gameLaunches: 1,
      },
    },
  ]),

  CreditAudit.aggregate([
  {
    $match: {
      action: "consumption",
      ...dateMatch,
    },
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: fmt,
          date: "$createdAt",
        },
      },
      creditsConsumed: {
        $sum: "$credits",
      },
    },
  },
  {
    $sort: {
      _id: 1,
    },
  },
  {
    $project: {
      _id: 0,
      date: "$_id",
      creditsConsumed: 1,
    },
  },
]),


]);

  const postViewMap  = new Map(postViewsGrowth.map(p => [p.date, p]));
  const likesMap     = new Map(likesGrowth.map(x => [x.date, x.likes]));
  const commentsMap  = new Map(commentsGrowth.map(x => [x.date, x.comments]));
  const sharesMap    = new Map(sharesGrowth.map(x => [x.date, x.shares]));
  const profileMap   = new Map(profileViewsGrowth.map(x => [x.date, x.profileViews]));
  const launchMap    = new Map(gamelaunchGrowth.map(x => [x.date, x.gameLaunches]));
  const creditsMap = new Map(creditConsumptionGrowth.map(x => [
    x.date,
    x.creditsConsumed,
  ])
);

console.log(
  "creditConsumptionGrowth",
  creditConsumptionGrowth
);

  const allDates = [
    ...postViewMap.keys(),
    ...likesMap.keys(),
    ...commentsMap.keys(),
    ...sharesMap.keys(),
    ...profileMap.keys(),
    ...launchMap.keys(),
    ...creditsMap.keys(), 
  ];

  const postGrowth = [...new Set(allDates)].sort().map(date => ({
    date,
    posts:        postViewMap.get(date)?.posts ?? 0,
    views:        postViewMap.get(date)?.views ?? 0,       // AllPost.viewsCount
    likes:        likesMap.get(date)           ?? 0,       // Like collection
    comments:     commentsMap.get(date)        ?? 0,       // Comment collection
    shares:       sharesMap.get(date)          ?? 0,       // UserActivityEvent(share)
    profileViews: profileMap.get(date)         ?? 0,
    gameLaunches: launchMap.get(date)          ?? 0,
    creditsConsumed:
  creditsMap.get(date) ?? 0,
  }));

  const result = { userGrowth, postGrowth, sessionGrowth };
  await CacheService.set(cacheKey, result, 60);
  return result;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts() {
  const cacheKey = "intel:alerts";
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const now      = new Date();
  const since24h = new Date(now - 86_400_000);
  const since7d  = new Date(now - 7 * 86_400_000);

  const alerts = [];

  const [failedGames, exhaustedGames, sessionHealth, lowEngagement] = await Promise.all([

    // Games with >15% failure rate (GameSession — authoritative)
    GameSession.aggregate([
      { $match: { createdAt: { $gte: since7d } } },
      {
        $group: {
          _id:      "$gamePost",
          total:    { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        },
      },
      { $addFields: { failureRate: { $multiply: [{ $divide: ["$failures", "$total"] }, 100] } } },
      { $match: { total: { $gte: 10 }, failureRate: { $gte: 15 } } },
      {
        $lookup: {
          from:         "allposts",
          localField:   "_id",
          foreignField: "_id",
          as:           "gameDoc",
          pipeline:     [{ $project: { "gamePost.gameName": 1 } }],
        },
      },
      {
        $project: {
          _id:         1,
          failureRate: { $round: ["$failureRate", 1] },
          gameName:    { $arrayElemAt: ["$gameDoc.gamePost.gameName", 0] },
        },
      },
      { $sort: { failureRate: -1 } },
      { $limit: 10 },
    ]),

    // Credit-exhausted games (AllPost — structural field)
    AllPost.find(
      { type: "game_post", "gamePost.creditBudget.status": "exhausted" },
      { "gamePost.gameName": 1 }
    ).lean(),

    // Overall session health last 24h (GameSession)
    GameSession.aggregate([
      { $match: { createdAt: { $gte: since24h } } },
      {
        $group: {
          _id:      null,
          total:    { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ["$status",     "failed"] }, 1, 0] } },
          crashes:  { $sum: { $cond: [{ $eq: ["$exitReason", "crash"]  }, 1, 0] } },
        },
      },
    ]),

    // Low-engagement posts:
    // views from AllPost.viewsCount, engagement from Like + Comment + UserActivityEvent(share)
    (async () => {
      const candidatePosts = await AllPost.find(
        { viewsCount: { $gte: 50 } },
        { _id: 1, viewsCount: 1 }
      ).lean();

      if (candidatePosts.length === 0) return [{ n: 0 }];

      const candidatePostIds = candidatePosts.map(p => p._id);
      const viewMap = new Map(candidatePosts.map(p => [String(p._id), p.viewsCount]));

      const [shareAgg, likeAgg, commentAgg] = await Promise.all([
        PostAnalytics.aggregate([
          { $unwind: "$dailyStats" },
          { $match: { "dailyStats.date": { $gte: since7d.toISOString().slice(0, 10) } } },
          { $group: { _id: "$postId", shares: { $sum: "$dailyStats.shares" } } },
        ]),
        Like.aggregate([
          { $match: { post: { $in: candidatePostIds }, createdAt: { $gte: since7d } } },
          { $group: { _id: "$post", count: { $sum: 1 } } },
        ]),
        Comment.aggregate([
          { $match: { post: { $in: candidatePostIds }, createdAt: { $gte: since7d } } },
          { $group: { _id: "$post", count: { $sum: 1 } } },
        ]),
      ]);

      const shareMap   = new Map(shareAgg.map(s => [String(s._id), s.shares]));
      const likeMap    = new Map(likeAgg.map(l => [String(l._id), l.count]));
      const commentMap = new Map(commentAgg.map(c => [String(c._id), c.count]));

      const lowEng = candidatePosts.filter(p => {
        const pid  = String(p._id);
        const views = viewMap.get(pid) ?? 0;
        const eng   = (likeMap.get(pid) ?? 0) + (commentMap.get(pid) ?? 0) + (shareMap.get(pid) ?? 0);
        return views > 0 ? (eng / views) * 100 < 1 : false;
      });

      return [{ n: lowEng.length }];
    })(),
  ]);

  if (failedGames.length > 0) {
    alerts.push({
      type:     "high_failure_rate",
      severity: failedGames.some(g => g.failureRate >= 30) ? "critical" : "warning",
      title:    `${failedGames.length} Game${failedGames.length > 1 ? "s" : ""} with High Failure Rate`,
      body:     "These games have a failure rate ≥15% over the last 7 days.",
      items:    failedGames.map(g => ({ _id: String(g._id), gameName: g.gameName, failureRate: g.failureRate })),
    });
  }

  if (exhaustedGames.length > 0) {
    alerts.push({
      type:     "credit_exhausted",
      severity: exhaustedGames.length >= 5 ? "critical" : "warning",
      title:    `${exhaustedGames.length} Game${exhaustedGames.length > 1 ? "s" : ""} Credit Exhausted`,
      body:     "These games have run out of credits and are no longer playable.",
      items:    exhaustedGames.map(g => ({ _id: String(g._id), gamePost: { gameName: g.gamePost?.gameName } })),
    });
  }

  const sh = sessionHealth[0];
  if (sh && sh.total >= 20) {
    const failRate  = (sh.failures / sh.total) * 100;
    const crashRate = (sh.crashes  / sh.total) * 100;
    if (crashRate >= 8) {
      alerts.push({ type: "high_crash_rate", severity: "critical",
        title: `Critical: ${crashRate.toFixed(1)}% Crash Rate in Last 24h`,
        body:  `${sh.crashes} of ${sh.total} sessions crashed.` });
    } else if (crashRate >= 3) {
      alerts.push({ type: "elevated_crash_rate", severity: "warning",
        title: `Elevated Crash Rate: ${crashRate.toFixed(1)}% in Last 24h`,
        body:  `${sh.crashes} sessions crashed. Monitor for trend.` });
    }
    if (failRate >= 20) {
      alerts.push({ type: "high_failure_rate_global", severity: "critical",
        title: `Critical: ${failRate.toFixed(1)}% Session Failure Rate (24h)`,
        body:  `${sh.failures} of ${sh.total} sessions failed in the last 24 hours.` });
    }
  }

  const lowEng = lowEngagement[0]?.n ?? 0;
  if (lowEng >= 20) {
    alerts.push({ type: "low_engagement", severity: "info",
      title: `${lowEng} Posts with Very Low Engagement`,
      body:  "Posts with ≥50 views but <1% engagement rate." });
  }

  await CacheService.set(cacheKey, alerts, 30);
  return alerts;
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export async function getDiscovery(query = {}) {
  const { dateMatch } = parseDateRange(query);
  const cacheKey = `intel:discovery:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const [topPosts, topGames, topCreatorAgg] = await Promise.all([

    AllPost.aggregate([
      { $match: { type: { $nin: AD_TARGET_TYPES }, ...dateMatch } },
      { $sort:  { viewsCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:     "users",
          localField: "user",
          foreignField: "_id",
          as:       "creator",
          pipeline: [{ $project: { username: 1 } }],
        },
      },
      {
        $project: {
          type: 1, description: 1, createdAt: 1, viewsCount: 1,
          gamePost:    { gameName: "$gamePost.gameName" },
          modelPost:   { title:   "$modelPost.title"   },
          adModelPost: { brandName: "$adModelPost.brandName" },
          mediaAdPost: { brandName: "$mediaAdPost.brandName" },
          creator:     { $arrayElemAt: ["$creator", 0] },
        },
      },
    ]),

    AllPost.aggregate([
      { $match: { type: "game_post", ...dateMatch } },
      { $sort:  { viewsCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:     "users",
          localField: "user",
          foreignField: "_id",
          as:       "creator",
          pipeline: [{ $project: { username: 1 } }],
        },
      },
      {
        $project: {
          gamePost:  { gameName: "$gamePost.gameName" },
          creator:   { $arrayElemAt: ["$creator", 0] },
          viewsCount: 1, createdAt: 1,
        },
      },
    ]),

    // Creator rankings by sum(AllPost.viewsCount)
    AllPost.aggregate([
      { $match: { ...dateMatch } },
      {
        $group: {
          _id:        "$user",
          totalViews: { $sum: "$viewsCount" },
          postsCount: { $sum: 1 },
        },
      },
      { $sort:  { totalViews: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const creatorIds    = topCreatorAgg.map(c => c._id).filter(Boolean);
  const creatorDocs   = await User.find({ _id: { $in: creatorIds } }, { username: 1, avatar: 1, followersCount: 1 }).lean();
  const creatorDocMap = new Map(creatorDocs.map(c => [String(c._id), c]));

  const topCreators = topCreatorAgg.map(({ _id, totalViews, postsCount }) => {
    const doc = creatorDocMap.get(String(_id)) ?? {};
    return {
      _id:            String(_id),
      username:       doc.username       ?? "—",
      followersCount: doc.followersCount ?? 0,
      stats:          { totalViews, postsCount },
    };
  });

  const result = { topPosts, topGames, topCreators };
  await CacheService.set(cacheKey, result, 300);
  return result;
}

// ─── Advertising ──────────────────────────────────────────────────────────────

export async function getAds(query = {}) {
  const { dateMatch } = parseDateRange(query);
  const cacheKey = `intel:ads:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const [adPostStats, clicksByPost] = await Promise.all([
    AllPost.aggregate([
      { $match: { type: { $in: AD_TARGET_TYPES }, ...dateMatch } },
      {
        $group: {
          _id:            "$_id",
          type:           { $first: "$type" },
          brandNameMedia: { $first: "$mediaAdPost.brandName" },
          brandNameModel: { $first: "$adModelPost.brandName" },
          views:          { $sum: "$viewsCount" },
          uniqueViews:    { $sum: "$uniqueViewsCount" },
        },
      },
    ]),

    UserActivityEvent.aggregate([
      { $match: { eventType: "ad_click", targetId: { $ne: null }, ...dateMatch } },
      { $group: { _id: "$targetId", clicks: { $sum: 1 } } },
    ]),
  ]);

  const clicksByPostMap = new Map(clicksByPost.map(x => [String(x._id), x.clicks]));
  const brandAccMedia   = {};
  const brandAccModel   = {};

  for (const doc of adPostStats) {
    const clicks = clicksByPostMap.get(String(doc._id)) ?? 0;
    if (doc.type === "media_ad_post") {
      const brand = doc.brandNameMedia ?? "Unknown";
      if (!brandAccMedia[brand]) brandAccMedia[brand] = { impressions: 0, clicks: 0, uniqueViews: 0, count: 0 };
      brandAccMedia[brand].impressions += doc.views;
      brandAccMedia[brand].clicks      += clicks;
      brandAccMedia[brand].uniqueViews += doc.uniqueViews;
      brandAccMedia[brand].count       += 1;
    } else if (doc.type === "ad_model_post") {
      const brand = doc.brandNameModel ?? "Unknown";
      if (!brandAccModel[brand]) brandAccModel[brand] = { views: 0, uniqueViews: 0, count: 0 };
      brandAccModel[brand].views       += doc.views;
      brandAccModel[brand].uniqueViews += doc.uniqueViews;
      brandAccModel[brand].count       += 1;
    }
  }

  const mediaAds = Object.entries(brandAccMedia).map(([brand, stats]) => ({
    _id:         brand,
    impressions: stats.impressions,
    clicks:      stats.clicks,
    ctr:         stats.impressions > 0
      ? parseFloat(((stats.clicks / stats.impressions) * 100).toFixed(2))
      : 0,
    views:       stats.impressions,
    uniqueViews: stats.uniqueViews,
    likes:       0,
    count:       stats.count,
  })).sort((a, b) => b.impressions - a.impressions);

  const adModels = Object.entries(brandAccModel).map(([brand, stats]) => ({
    _id:         brand,
    views:       stats.views,
    uniqueViews: stats.uniqueViews,
    likes:       0,
    count:       stats.count,
  })).sort((a, b) => b.views - a.views);

  const topBrands = mediaAds.slice(0, 10).map(b => ({
    _id: b._id, totalImpressions: b.impressions, clicks: b.clicks,
  }));

  const result = { mediaAds, adModels, topBrands };
  await CacheService.set(cacheKey, result, 30);
  return result;
}

// ─── Creator Analytics ────────────────────────────────────────────────────────

export async function getCreatorAnalytics(creatorId, query = {}) {
  const { dateMatch } = parseDateRange(query);
  const uid = new mongoose.Types.ObjectId(creatorId);

  const posts   = await AllPost.find({ user: uid, ...dateMatch }, { _id: 1, viewsCount: 1, uniqueViewsCount: 1 }).lean();
  const postIds = posts.map(p => p._id);

  if (postIds.length === 0) {
    return { contentViews: 0, uniqueViewers: 0, likes: 0, comments: 0, shares: 0, profileViews: 0, followersGained: 0, engagementRate: 0 };
  }

  const contentViews  = posts.reduce((s, p) => s + (p.viewsCount      ?? 0), 0);
  const uniqueViewers = posts.reduce((s, p) => s + (p.uniqueViewsCount ?? 0), 0);

  const [profileViewCount, likesCount, commentsCount, sharesCount] = await Promise.all([
    UserActivityEvent.aggregate([
      { $match: { eventType: "profile_page_view", targetId: uid, ...dateMatch } },
      { $count: "n" },
    ]),
    Like.countDocuments({ post: { $in: postIds }, ...dateMatch }),
    Comment.countDocuments({ post: { $in: postIds }, ...dateMatch }),
    UserActivityEvent.countDocuments({ eventType: "share", targetId: { $in: postIds }, ...dateMatch }),
  ]);

  const engagementRate = uniqueViewers > 0
    ? parseFloat((((likesCount + commentsCount + sharesCount) / uniqueViewers) * 100).toFixed(2))
    : 0;

  return {
    contentViews,
    uniqueViewers,
    likes:           likesCount,
    comments:        commentsCount,
    shares:          sharesCount,
    profileViews:    profileViewCount[0]?.n ?? 0,
    followersGained: 0,
    engagementRate,
  };
}

// ─── Search Analytics ─────────────────────────────────────────────────────────

export async function getSearchAnalytics(query = {}) {
  const { dateMatch } = parseDateRange(query);
  const cacheKey = `intel:search:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const [searches, clicks, topQueries, topClicked] = await Promise.all([
    UserActivityEvent.countDocuments({ eventType: "search",       ...dateMatch }),
    UserActivityEvent.countDocuments({ eventType: "search_click", ...dateMatch }),
    UserActivityEvent.aggregate([
      { $match: { eventType: "search", "metadata.query": { $exists: true, $ne: "" }, ...dateMatch } },
      { $group:   { _id: "$metadata.query", count: { $sum: 1 } } },
      { $sort:    { count: -1 } },
      { $limit:   20 },
      { $project: { _id: 0, query: "$_id", count: 1 } },
    ]),
    UserActivityEvent.aggregate([
      { $match: { eventType: "search_click", targetId: { $ne: null }, ...dateMatch } },
      { $group: { _id: "$targetId", clicks: { $sum: 1 } } },
      { $sort:  { clicks: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from:       "allposts",
          localField: "_id",
          foreignField: "_id",
          as:         "post",
          pipeline:   [{ $project: { "gamePost.gameName": 1, "modelPost.title": 1, description: 1, type: 1 } }],
        },
      },
      { $project: { _id: 0, clicks: 1, post: { $arrayElemAt: ["$post", 0] } } },
    ]),
  ]);

  const ctr = searches > 0 ? parseFloat(((clicks / searches) * 100).toFixed(2)) : 0;

  const result = { totalSearches: searches, searchClicks: clicks, searchCtr: ctr, topQueries, topClickedResults: topClicked };
  await CacheService.set(cacheKey, result, 30);
  return result;
}

// ─── Profile Analytics ────────────────────────────────────────────────────────

export async function getProfileAnalytics(query = {}) {
  const { dateMatch } = parseDateRange(query);
  const cacheKey = `intel:profiles:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const [totalViews, uniqueVisitors, topProfiles] = await Promise.all([
    UserActivityEvent.countDocuments({ eventType: "profile_page_view", ...dateMatch }),
    UserActivityEvent.aggregate([
      { $match: { eventType: "profile_page_view", ...dateMatch } },
      { $group: { _id: "$user" } },
      { $count: "n" },
    ]),
    UserActivityEvent.aggregate([
      { $match: { eventType: "profile_page_view", targetId: { $ne: null }, ...dateMatch } },
      { $group:  { _id: "$targetId", views: { $sum: 1 } } },
      { $sort:   { views: -1 } },
      { $limit:  10 },
      {
        $lookup: {
          from:       "users",
          localField: "_id",
          foreignField: "_id",
          as:         "userDoc",
          pipeline:   [{ $project: { username: 1, avatar: 1 } }],
        },
      },
      { $project: { _id: 0, views: 1, username: { $arrayElemAt: ["$userDoc.username", 0] } } },
    ]),
  ]);

  const result = {
    totalProfileViews:     totalViews,
    uniqueProfileVisitors: uniqueVisitors[0]?.n ?? 0,
    mostViewedProfiles:    topProfiles,
  };

  await CacheService.set(cacheKey, result, 60);
  return result;
}

// ─── User Analytics ───────────────────────────────────────────────────────────

export async function getUserAnalytics(query = {}) {
  const { dateMatch } = parseDateRange(query);
  const cacheKey = `intel:useranalytics:${JSON.stringify(dateMatch)}`;
  const cached   = await CacheService.get(cacheKey);
  if (cached) return cached;

  const now         = new Date();
  const mStart      = new Date(now); mStart.setDate(mStart.getDate() - 29); mStart.setHours(0, 0, 0, 0);
  const prev30Start = new Date(mStart); prev30Start.setDate(prev30Start.getDate() - 30);

  const [totals, retention, activeInPeriod] = await Promise.all([
    User.aggregate([
      {
        $facet: {
          total:    [{ $count: "n" }],
          new:      [{ $match: { ...dateMatch } }, { $count: "n" }],
          verified: [{ $match: { isVerified: true } }, { $count: "n" }],
        },
      },
    ]),

    // FIX: Retention uses UserSession (not UserActivityEvent)
    (async () => {
      const [prev, curr] = await Promise.all([
        UserSession.distinct("user", { startedAt: { $gte: prev30Start, $lt: mStart } }),
        UserSession.distinct("user", { startedAt: { $gte: mStart } }),
      ]);
      const prevSet  = new Set(prev.map(String));
      const retained = curr.filter(u => prevSet.has(String(u))).length;
      return {
        prevCount: prev.length,
        retained,
        rate: prev.length > 0
          ? parseFloat(((retained / prev.length) * 100).toFixed(1))
          : 0,
      };
    })(),

    // FIX: Active users in period from UserSession (not UserActivityEvent)
    UserSession.aggregate([
      { $match: { startedAt: { ...dateMatch.createdAt ?? {} } } },
      { $group: { _id: "$user" } },
      { $count: "n" },
    ]),
  ]);

  const result = {
    totalUsers:    totals[0]?.total[0]?.n   ?? 0,
    newUsers:      totals[0]?.new[0]?.n      ?? 0,
    verified:      totals[0]?.verified[0]?.n ?? 0,
    activeUsers:   activeInPeriod[0]?.n      ?? 0,
    retentionRate: retention.rate,
    retentionDetail: {
      previousPeriodUsers: retention.prevCount,
      retained:            retention.retained,
    },
  };

  await CacheService.set(cacheKey, result, 30);
  return result;
}