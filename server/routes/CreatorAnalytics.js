// routes/analytics.js

import express from "express";
import mongoose from "mongoose";
import AllPost from "../models/Allposts.js";
import DemoConsumption from "../models/DemoConsumption.js";
import PostAnalytics from "../models/postAnalytics.js";
import GameSession from "../models/GameSession.js";
import verifyToken       from "../middlewares/authMiddleware.js";
import requireAdmin      from "../middlewares/adminMiddleware.js";

const router = express.Router();

// ─── CHART / RANGE HELPERS ────────────────────────────────────────────────────

const RANGES = [7, 30, 90];

/**
 * Build a date-keyed lookup from a dailyStats array for O(1) access.
 * Handles the edge case where the same date appears more than once
 * (high-concurrency duplicate push) by summing fields.
 */
function buildDateMap(dailyStats = []) {
  const map = new Map();
  for (const stat of dailyStats) {
    if (!map.has(stat.date)) {
      map.set(stat.date, { ...stat });
    } else {
      const existing = map.get(stat.date);
      for (const key of Object.keys(stat)) {
        if (key !== "date" && typeof stat[key] === "number") {
          existing[key] = (existing[key] || 0) + stat[key];
        }
      }
    }
  }
  return map;
}

/**
 * Build a filled N-day array for a single metric field.
 * Days with no data get 0.
 */
function buildNDayArray(dateMap, days, field) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split("T")[0];
    result.push(dateMap.get(key)?.[field] || 0);
  }
  return result;
}

/**
 * Return { "7d": [], "30d": [], "90d": [] } for a single field.
 * Frontend can switch ranges without a second API call.
 */
function buildMultiRangeChart(dateMap, field) {
  return {
    "7d":  buildNDayArray(dateMap, 7,  field),
    "30d": buildNDayArray(dateMap, 30, field),
    "90d": buildNDayArray(dateMap, 90, field),
  };
}

/**
 * Sum a field across the last N days using a pre-built dateMap.
 */
function sumRange(dateMap, days, field) {
  let total = 0;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split("T")[0];
    total += dateMap.get(key)?.[field] || 0;
  }
  return total;
}

/**
 * Produce a stats object for a time window from the dateMap.
 * Merges session data (separate dateMap) into the same object.
 */
function getStatsForRange(dateMap, sessionDateMap, days) {
  const fields = [
    "views", "uniqueViews", "watchTimeMs",
    "likes", "comments","shares", "demoConsumptions",
    "sessions", "sessionPlayTimeMs", "uniquePlayers",
  ];

  const totals = Object.fromEntries(fields.map(f => [f, 0]));

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().split("T")[0];

    const stat = dateMap.get(key) || {};
    for (const f of fields) {
      if (stat[f]) totals[f] += stat[f];
    }

    // Merge legacy session data if it lives in a separate map
    const sessionStat = sessionDateMap?.get(key) || {};
    if (sessionStat.sessions)         totals.sessions         += sessionStat.sessions;
    if (sessionStat.sessionPlayTimeMs)totals.sessionPlayTimeMs+= sessionStat.sessionPlayTimeMs || sessionStat.playTime || 0;
  }

  return totals;
}

/**
 * Growth rate between two periods (week-over-week, month-over-month).
 * Returns percentage change and a trend label.
 */
function computeGrowth(current, previous) {
  if (previous === 0 && current === 0) return { rate: 0, trend: "stable" };
  if (previous === 0) return { rate: 100, trend: "up" };
  const rate = Number((((current - previous) / previous) * 100).toFixed(1));
  return { rate, trend: rate > 2 ? "up" : rate < -2 ? "down" : "stable" };
}

async function buildCreatorAnalytics(userId) {
    try {

    // ── Posts ──────────────────────────────────────────────────────────────
    const posts = await AllPost.find({
  user: userId,
  type: {
    $in: [
      "normal_post",
      "model_post",
      "game_post",
      "ad_model_post",
      "media_ad_post",
    ],
  },
})
.select(
  `
    type
    description
    viewsCount
    uniqueViewsCount
    likesCount
    commentsCount
    gamePost
    modelPost
    adModelPost
    mediaAdPost
    devlogMeta
    createdAt
  `
)
.lean();

    // ── PostAnalytics (includes lifetime + dailyStats) ─────────────────────
    const analyticsDocs = await PostAnalytics.find({
      post: { $in: posts.map(p => p._id) },
    }).lean();

    const analyticsMap = new Map(
      analyticsDocs.map(doc => [doc.post.toString(), doc])
    );

    // ── Game-specific aggregates ───────────────────────────────────────────
    const gamePostIds = posts
      .filter(p => p.type === "game_post")
      .map(p => p._id);

    // DemoConsumptions — still aggregate from source for accuracy
    const demoStats = await DemoConsumption.aggregate([
      { $match: { gamePost: { $in: gamePostIds }, status: "consumed" } },
      { $group: { _id: "$gamePost", demoConsumption: { $sum: 1 } } },
    ]);
    const demoMap = new Map(demoStats.map(d => [d._id.toString(), d.demoConsumption]));

    // GameSessions — aggregate for lifetime totals + unique/repeat players
    const sessionStats = await GameSession.aggregate([
      { $match: { gamePost: { $in: gamePostIds }, status: "ended" } },
      {
        $group: {
          _id: "$gamePost",
          totalSessions:    { $sum: 1 },
          totalSessionTime: { $sum: "$metrics.totalPlayTime" },
          avgSessionTime:   { $avg: "$metrics.totalPlayTime" },
          uniqueUserIds:    { $addToSet: "$user" },
          totalCreditsBurned: {
            $sum: "$billing.creditsConsumed"
          },
        },
      },
    ]);

const sessionMap = new Map(
  sessionStats.map(s => {
    const uniquePlayers =
      s.uniqueUserIds?.length || 0;

    const totalSessions =
      s.totalSessions || 0;

    return [
      s._id.toString(),
      {
        totalSessions,
        totalSessionTime:
          s.totalSessionTime || 0,

        totalCreditsBurned:
      s.totalCreditsBurned || 0,

        avgSessionTime:
          Math.round(
            s.avgSessionTime || 0
          ),

        uniquePlayers,

        // repeatPlayers:
        //   Math.max(
        //     0,
        //     totalSessions - uniquePlayers
        //   ),
      },
    ];
  })
);

    // ── Per-asset build ────────────────────────────────────────────────────
    const assets = posts.map(post => {
      const analytics  = analyticsMap.get(post._id.toString()) || {};
      const dailyStats = analytics.dailyStats || [];
      const dateMap    = buildDateMap(dailyStats);
      const sessionData = sessionMap.get(post._id.toString()) || {};

      // For games, session data may live only in GameSession aggregation
      // (before it gets written into PostAnalytics). We merge both sources.
      const sessionDateMap = new Map(); // populated from analytics.dailyStats which now includes sessions

      // ── Time-range stats ─────────────────────────────────────────────────
      const today    = getStatsForRange(dateMap, sessionDateMap, 1);
      const last7    = getStatsForRange(dateMap, sessionDateMap, 7);
      const last30   = getStatsForRange(dateMap, sessionDateMap, 30);
      const last90   = getStatsForRange(dateMap, sessionDateMap, 90);

      // ── Growth indicators ─────────────────────────────────────────────────
      const thisWeek  = sumRange(dateMap, 7,  "views");
      const lastWeek  = (() => {
        let t = 0;
        for (let i = 13; i >= 7; i--) {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - i);
          t += dateMap.get(d.toISOString().split("T")[0])?.views || 0;
        }
        return t;
      })();

      const thisMonth = sumRange(dateMap, 30, "views");
      const lastMonth = (() => {
        let t = 0;
        for (let i = 59; i >= 30; i--) {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - i);
          t += dateMap.get(d.toISOString().split("T")[0])?.views || 0;
        }
        return t;
      })();

      const wow = computeGrowth(thisWeek, lastWeek);
      const mom = computeGrowth(thisMonth, lastMonth);

      const growthIndicators = {
        weekOverWeekGrowth:   wow.rate,
        monthOverMonthGrowth: mom.rate,
        trend:                wow.trend, // most recent signal
      };

      // ── Multi-range charts ────────────────────────────────────────────────
      const charts = {
        views:            buildMultiRangeChart(dateMap, "views"),
        uniqueViews:      buildMultiRangeChart(dateMap, "uniqueViews"),
        watchTime:        buildMultiRangeChart(dateMap, "watchTimeMs"),
        likes:            buildMultiRangeChart(dateMap, "likes"),
        comments:         buildMultiRangeChart(dateMap, "comments"),
        shares:           buildMultiRangeChart(dateMap, "shares"),
        demoConsumptions: buildMultiRangeChart(dateMap, "demoConsumptions"),
        sessions:         buildMultiRangeChart(dateMap, "sessions"),
        playTime:         buildMultiRangeChart(dateMap, "sessionPlayTimeMs"),
        conversionRate:   buildConversionRateChart(dateMap, RANGES),
      };

      // ── Lifetime block ────────────────────────────────────────────────────
      const lt = analytics.lifetime || {};

      // Prefer PostAnalytics.lifetime (written by workers) but fall back to
      // AllPost counters for views/likes/comments which are always accurate.

      const likes = post.likesCount || lt.likes || 0;
      const comments = post.commentsCount || lt.comments || 0;
      const shares = lt.shares || 0;

      const lifetimeBase = {
        views:       post.viewsCount || lt.views || 0,
        uniqueViews: post.uniqueViewsCount || lt.uniqueViews || 0,
        watchTimeMs: lt.watchTimeMs || analytics.totalWatchTimeMs || 0,
        avgWatchTimeMs: analytics.avgWatchTimeMs || 0,

        likes:       post.likesCount || lt.likes || 0,
        comments:    post.commentsCount || lt.comments || 0,
        shares,

        engagementRate:
          post.uniqueViewsCount > 0
            ? Number(
                (
                  (
                    (likes + comments + shares) /
                    post.uniqueViewsCount
                  ) *
                  100
                ).toFixed(2)
              )
            : 0,
      };

      // ── Base asset shape ──────────────────────────────────────────────────
      const base = {
        _id: post._id,
        createdAt: post.createdAt,

        // Legacy flat fields (backward compat)
        totalViews:  post.viewsCount || 0,
        uniqueViews: post.uniqueViewsCount || 0,
        likes:       post.likesCount || 0,
        comments:    post.commentsCount || 0,
        shares      : shares,

        today,
        last7Days:  last7,
        last30Days: last30,
        last90Days: last90,

        charts,
        growthIndicators,

        lifetime: lifetimeBase,
      };

      // ── Game ──────────────────────────────────────────────────────────────
      if (post.type === "game_post") {
        const demoConsumptions = demoMap.get(post._id.toString()) || lt.demoConsumptions || 0;
        const uniqueV          = post.uniqueViewsCount || 0;
        const sessions         = sessionData.totalSessions || lt.sessions || 0;
        const sessionPlayTimeMs= sessionData.totalSessionTime || lt.sessionPlayTimeMs || 0;
        const uniquePlayers    = sessionData.uniquePlayers || lt.uniquePlayers || 0;
        // const repeatPlayers    = sessionData.repeatPlayers || lt.repeatPlayers || 0;
        const totalSessions    = sessions;
        // const retentionRate    = uniquePlayers > 0
        //   ? Number(((repeatPlayers / uniquePlayers) * 100).toFixed(2))
        //   : 0;
        const demoConversionRate = uniqueV > 0
          ? Number(((demoConsumptions / uniqueV) * 100).toFixed(2))
          : 0;
        const playerConversionRate = uniqueV > 0
          ? Number(((uniquePlayers / uniqueV) * 100).toFixed(2))
          : 0;
        const avgSessionDurationMs = totalSessions > 0
          ? Math.round(sessionPlayTimeMs / totalSessions)
          : 0;
        const avgPlayTimePerUserMs = uniquePlayers > 0
          ? Math.round(sessionPlayTimeMs / uniquePlayers)
          : 0;
        
        

        return {
          ...base,
          type: "game",
          displayName: post.gamePost?.gameName || "Untitled Game",

          // Legacy flat fields
          totalSessions,
          totalSessionTime: sessionPlayTimeMs,
          avgSessionTime:   sessionData.avgSessionTime || avgSessionDurationMs,
          demoConsumption:  demoConsumptions,
          conversionRate:   demoConversionRate,

          developerCreditsBurned:
  sessionData.totalCreditsBurned || 0,

          lifetime: {
            ...lifetimeBase,
            demoConsumptions,
            demoConversionRate,
            playerConversionRate,
            sessions,
            sessionPlayTimeMs,
            avgSessionDurationMs,
            avgPlayTimePerUserMs,
            uniquePlayers,
            // repeatPlayers,
            // retentionRate,
            developerCreditsBurned:
  sessionData.totalCreditsBurned || 0,
          },
        };
      }

      if (post.type === "media_ad_post") {
        return {
          ...base,

          type: "media_ad",

          displayName:
            post.mediaAdPost?.brandName ||
            "Media Advertisement",
        };
      }

      // ── 3D Ad ─────────────────────────────────────────────────────────────
      if (post.type === "ad_model_post") {
        return {
          ...base,
          type: "3d_ad",
          displayName:
            post.description?.trim() ||
            post.adModelPost?.brandName ||
            post.adModelPost?.asset?.name ||
            "3D Advertisement",

          lifetime: {
            ...lifetimeBase,
            vertices:  post.adModelPost?.asset?.metadata?.geometry?.vertices  || 0,
            triangles: post.adModelPost?.asset?.metadata?.geometry?.triangles || 0,
          },

          triangles: post.adModelPost?.asset?.metadata?.geometry?.triangles || 0,
          vertices:  post.adModelPost?.asset?.metadata?.geometry?.vertices  || 0,
        };
      }

          if (post.type === "model_post") {
        return {
          ...base,

          type: "model",

          displayName:
            post.modelPost?.title ||
            "3D Model",

          lifetime: {
            ...lifetimeBase,
          },
          price:
            post.modelPost?.price || 0,
        };
      }

      if (post.type === "normal_post") {
        return {
          ...base,

          type: "post",

          displayName:
            post.description?.trim()?.slice(0, 80) ||
            "Post",
        };
      }

      return {
  ...base,

  type: "unknown",

  displayName: "Unknown Content",
};
    });

    // ── Portfolio ──────────────────────────────────────────────────────────
    const portfolio = buildPortfolio(assets);

    return { portfolio, assets };
  } catch (error) {
    throw error;
  }
}

// ─── ROUTE ───────────────────────────────────────────────────────────────────

router.get("/creator", verifyToken, async (req, res) => {
  try {
    const analytics = await buildCreatorAnalytics(
      new mongoose.Types.ObjectId(req.user.id)
    );

    res.json(analytics);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to load analytics",
    });
  }
});

router.get(
  "/creator/:creatorId",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.creatorId)) {
        return res.status(400).json({
          message: "Invalid creator id",
        });
      }

      const analytics = await buildCreatorAnalytics(
        new mongoose.Types.ObjectId(req.params.creatorId)
      );

      res.json(analytics);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Failed to load analytics",
      });
    }
  }
);
// ─── PORTFOLIO BUILDER ────────────────────────────────────────────────────────

function buildPortfolio(assets) {
  const sum  = (field) => assets.reduce((s, a) => s + (a[field] || 0), 0);
  const lsum = (field) => assets.reduce((s, a) => s + (a.lifetime?.[field] || 0), 0);

  // Range-aware portfolio stats
  const rangeStats = (rangeKey) =>
    assets.reduce(
      (acc, a) => {
        const r = a[rangeKey] || {};
        acc.totalViews       += r.views       || 0;
        acc.totalUniqueViews += r.uniqueViews || 0;
        acc.totalWatchTimeMs += r.watchTimeMs || 0;
        acc.totalLikes       += r.likes       || 0;
        acc.totalComments    += r.comments    || 0;
        acc.totalShares      += r.shares      || 0;
        acc.totalDemoConsumptions += r.demoConsumptions || 0;
        acc.totalSessions    += r.sessions    || 0;
        acc.totalPlayTimeMs  += r.sessionPlayTimeMs || 0;
        return acc;
      },
      {
        totalViews: 0, totalUniqueViews: 0, totalWatchTimeMs: 0,
        totalLikes: 0, totalComments: 0, totalShares: 0, totalDemoConsumptions: 0,
        totalSessions: 0, totalPlayTimeMs: 0,
      }
    );

  const lifetimeTotals = {
    totalViews:            lsum("views"),
    totalUniqueViews:      lsum("uniqueViews"),
    totalWatchTimeMs:      lsum("watchTimeMs"),
    avgWatchTimeMs:        0,
    totalLikes:            lsum("likes"),
    totalComments:         lsum("comments"),
    totalShares:           lsum("shares"),
    totalDemoConsumptions: lsum("demoConsumptions"),
    totalSessions:         lsum("sessions"),
    totalPlayTimeMs:       lsum("sessionPlayTimeMs"),
    avgSessionDurationMs:  0,
  };

  if (lifetimeTotals.totalViews > 0) {
    lifetimeTotals.avgWatchTimeMs = Math.round(
      lifetimeTotals.totalWatchTimeMs / lifetimeTotals.totalViews
    );
  }
  if (lifetimeTotals.totalSessions > 0) {
    lifetimeTotals.avgSessionDurationMs = Math.round(
      lifetimeTotals.totalPlayTimeMs / lifetimeTotals.totalSessions
    );
  }

  // Top assets
  const sortedByViews      = [...assets].sort((a, b) => (b.lifetime?.views      || 0) - (a.lifetime?.views      || 0));
  const sortedByEngagement = [...assets].sort((a, b) => (b.lifetime?.engagementRate || 0) - (a.lifetime?.engagementRate || 0));
  const sortedByConversion = [...assets].sort((a, b) => (b.lifetime?.demoConversionRate || 0) - (a.lifetime?.demoConversionRate || 0));
  const sortedBySessions   = [...assets].sort((a, b) => (b.lifetime?.sessions   || 0) - (a.lifetime?.sessions   || 0));

  const topN = (sorted, n = 5) =>
    sorted.slice(0, n).map(a => ({
      _id: a._id,
      displayName: a.displayName,
      type: a.type,
      value: sorted === sortedByViews      ? a.lifetime?.views
           : sorted === sortedByEngagement ? a.lifetime?.engagementRate
           : sorted === sortedByConversion ? a.lifetime?.demoConversionRate
           :                                 a.lifetime?.sessions,
    }));

  return {
    // Backward-compat flat fields
    totalViews:            sum("totalViews"),
    totalUniqueViews:      sum("uniqueViews"),
    totalLikes:            sum("likes"),
    totalComments:         sum("comments"),
    totalShares: assets.reduce(
      (s, a) => s + (a.shares || 0),
      0
    ),
    totalPosts:assets.filter(a => a.type === "post").length,
    totalGames:assets.filter(a => a.type === "game").length,
    totalModels:assets.filter(a => a.type === "model").length,
    total3DAds:assets.filter(a => a.type === "3d_ad").length,
    totalMediaAds:assets.filter(a => a.type === "media_ad").length,
    totalDemoConsumptions: assets.reduce((s, a) => s + (a.demoConsumption || 0), 0),
    totalSessions:         assets.reduce((s, a) => s + (a.totalSessions || 0), 0),
    totalPlayTime:         assets.reduce((s, a) => s + (a.totalSessionTime || 0), 0),

    // Range-aware portfolio blocks
    lifetime:  lifetimeTotals,
    today:     rangeStats("today"),
    last7Days: rangeStats("last7Days"),
    last30Days:rangeStats("last30Days"),
    last90Days:rangeStats("last90Days"),

    // Top assets
    topAssets: {
      topByViews:      topN(sortedByViews),
      topByEngagement: topN(sortedByEngagement),
      topByConversion: topN(sortedByConversion),
      topBySessions:   topN(sortedBySessions),
    },
  };
}



// ─── PRIVATE CHART HELPER ─────────────────────────────────────────────────────

function buildConversionRateChart(dateMap, ranges) {
  const result = {};
  for (const days of ranges) {
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().split("T")[0];
      const stat = dateMap.get(key) || {};
      const uv = stat.uniqueViews || 0;
      const dc = stat.demoConsumptions || 0;
      arr.push(uv > 0 ? Number(((dc / uv) * 100).toFixed(2)) : 0);
    }
    result[`${days}d`] = arr;
  }
  return result;
}

export default router;