
// src/services/sessionMonitoring.js

import GameSession from "../models/GameSession.js";
import mongoose    from "mongoose";
import {
  parseDateRange,
  parseDateRangeBounds,
  getPreviousPeriod,
} from "../utils/dateRange.js";
import CacheService from "./cacheService.js";

// ─── Health Thresholds ────────────────────────────────────────────────────────

const HEALTH_THRESHOLDS = {
  LOW_VOLUME: 50,

  LOW_VOLUME_WARNING: 20,
  LOW_VOLUME_CRITICAL: 40,

  NORMAL_WARNING: 7,
  NORMAL_CRITICAL: 15,

  CRASH_WARNING: 3,
  CRASH_CRITICAL: 8,

  DISCONNECT_WARNING: 10,
  DISCONNECT_CRITICAL: 20,
};

/**
 * @param {number} failureRate
 * @param {number} crashRate
 * @param {number} disconnectRate
 * @param {number} totalSessions
 * @returns {"Healthy"|"Good"|"Warning"|"Critical"}
 */

function calculateHealthScore({
  failureRate,
  crashRate,
  disconnectRate,
  totalSessions,
}) {
  let score = 100;

  const confidence = Math.max(
    0.5,
    Math.min(totalSessions / 50, 1)
  );

  score -= failureRate * 1.5 * confidence;
  score -= crashRate * 3 * confidence;
  score -= disconnectRate * confidence;

  return Math.max(0, Math.round(score));
}

function scoreToHealth(score) {
  if (score >= 85) return "Healthy";
  if (score >= 70) return "Good";
  if (score >= 50) return "Warning";
  return "Critical";
}

// ─── Simple in-process cache ──────────────────────────────────────────────────
// For expensive aggregations. TTL: 30s for most; live is never cached.

const _cache = new Map();
function cacheGet(key)            { const e = _cache.get(key); return e && Date.now() < e.exp ? e.val : null; }
function cacheSet(key, val, ttl)  { _cache.set(key, { val, exp: Date.now() + ttl }); return val; }

// ─── 1. Session Overview ──────────────────────────────────────────────────────

/**
 * Extended KPI snapshot respecting the selected date range.
 * @param {object} [query]  Express req.query
 */
export async function getSessionOverview(query = {}) {
  const { dateMatch, label } = parseDateRange(query);

  const cacheKey = `analytics:overview:${JSON.stringify(dateMatch)}`;

    const cached = await CacheService.get(cacheKey);

    if (cached) return cached;

  const [
    statusCounts,
    periodStats,
    creditsResult,
    timeMetrics,
  ] = await Promise.all([
    // Live status counts
    GameSession.aggregate([
      {
        $match: {
          status: {
            $in: [
              "waiting",
              "allocation_ready",
              "starting",
              "running",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Period stats
    GameSession.aggregate([
      {
        $match: {
          ...dateMatch,
          status: {
            $in: ["ended", "failed"],
          },
          startedAt: { $exists: true },
          endedAt: { $exists: true },
        },
      },

      {
        $group: {
          _id: null,

          total: { $sum: 1 },

          ended: {
            $sum: {
              $cond: [
                { $eq: ["$status", "ended"] },
                1,
                0,
              ],
            },
          },

          failed: {
            $sum: {
              $cond: [
                { $eq: ["$status", "failed"] },
                1,
                0,
              ],
            },
          },

          avgDuration: {
            $avg: {
              $subtract: [
                "$endedAt",
                "$startedAt",
              ],
            },
          },

          medianDuration: {
            $percentile: {
              input: {
                $subtract: [
                  "$endedAt",
                  "$startedAt",
                ],
              },
              p: [0.5],
              method: "approximate",
            },
          },

          p90Duration: {
            $percentile: {
              input: {
                $subtract: [
                  "$endedAt",
                  "$startedAt",
                ],
              },
              p: [0.9],
              method: "approximate",
            },
          },

          p95Duration: {
            $percentile: {
              input: {
                $subtract: [
                  "$endedAt",
                  "$startedAt",
                ],
              },
              p: [0.95],
              method: "approximate",
            },
          },

          maxDuration: {
            $max: {
              $subtract: [
                "$endedAt",
                "$startedAt",
              ],
            },
          },

          minDuration: {
            $min: {
              $subtract: [
                "$endedAt",
                "$startedAt",
              ],
            },
          },

          avgQueueTime: {
            $avg: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$queueType",
                        "queued",
                      ],
                    },
                    "$startedAt",
                  ],
                },
                {
                  $subtract: [
                    "$startedAt",
                    "$createdAt",
                  ],
                },
                null,
              ],
            },
          },
        },
      },
    ]),

    // Credits
    GameSession.aggregate([
      { $match: { ...dateMatch } },

      {
        $group: {
          _id: null,

          totalCredits: {
            $sum:
              "$billing.creditsConsumed",
          },

          totalSessions: {
            $sum: 1,
          },

          uniqueUsers: {
            $addToSet: "$user",
          },

          uniqueGames: {
            $addToSet: "$gamePost",
          },
        },
      },
    ]),

    // Play time
    GameSession.aggregate([
      {
        $match: {
          ...dateMatch,
        },
      },

      {
        $group: {
          _id: null,

          totalPlayTime: {
            $sum:
              "$metrics.totalPlayTime",
          },

          totalSessions: {
            $sum: 1,
          },

          uniqueUsers: {
            $addToSet: "$user",
          },
        },
      },
    ]),
  ]);

  const statusMap = {};

  statusCounts.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  const p = periodStats[0] ?? {};
  const c = creditsResult[0] ?? {};
  const t = timeMetrics[0] ?? {};

  const median =
    p.medianDuration?.[0] ?? 0;

  const p90 =
    p.p90Duration?.[0] ?? 0;

  const p95 =
    p.p95Duration?.[0] ?? 0;

  const failureRate =
    p.total > 0
      ? (p.failed / p.total) * 100
      : 0;

  const successRate =
    100 - failureRate;

  const now = new Date();

  const { start } =
    parseDateRangeBounds(
      query.range,
      query.from,
      query.to
    );

  const dayCount = start
    ? Math.max(
        1,
        Math.ceil(
          (now - start) / 86400000
        )
      )
    : 1;

  const activeSessions =
    (statusMap.waiting ?? 0) +
    (statusMap.allocation_ready ?? 0) +
    (statusMap.starting ?? 0) +
    (statusMap.running ?? 0);

  const result = {
    rangeLabel: label,

    // Live
    activeSessions,
    runningSessions:
      statusMap.running ?? 0,
    waitingSessions:
      statusMap.waiting ?? 0,
    startingSessions:
      statusMap.starting ?? 0,

    // Period
    totalSessions: p.total ?? 0,
    completedSessions:
      p.ended ?? 0,
    failedSessions:
      p.failed ?? 0,

    successRate: parseFloat(
      successRate.toFixed(2)
    ),

    failureRate: parseFloat(
      failureRate.toFixed(2)
    ),

    avgSessionDuration:
      Math.round(
        p.avgDuration ?? 0
      ),

    medianSessionDuration:
      Math.round(median),

    p90SessionDuration:
      Math.round(p90),

    p95SessionDuration:
      Math.round(p95),

    longestSession:
      Math.round(
        p.maxDuration ?? 0
      ),

    shortestSession:
      Math.round(
        p.minDuration ?? 0
      ),

    avgQueueTime:
      Math.round(
        p.avgQueueTime ?? 0
      ),

    // Credits
    totalCreditsConsumed:
      c.totalCredits ?? 0,

    avgCreditsPerSession:
      c.totalSessions > 0
        ? Math.round(
            c.totalCredits /
              c.totalSessions
          )
        : 0,

    creditsBurnedPerDay:
      Math.round(
        (c.totalCredits ?? 0) /
          dayCount
      ),

    creditsBurnedPerUser:
      c.uniqueUsers?.length > 0
        ? Math.round(
            c.totalCredits /
              c.uniqueUsers.length
          )
        : 0,

    creditsBurnedPerGame:
      c.uniqueGames?.length > 0
        ? Math.round(
            c.totalCredits /
              c.uniqueGames.length
          )
        : 0,

    // Play Time
    totalPlayTime:
      t.totalPlayTime ?? 0,

    avgPlayTimePerSession:
      t.totalSessions > 0
        ? Math.round(
            t.totalPlayTime /
              t.totalSessions
          )
        : 0,

    avgPlayTimePerUser:
      t.uniqueUsers?.length > 0
        ? Math.round(
            t.totalPlayTime /
              t.uniqueUsers.length
          )
        : 0,
  };

  await CacheService.set(cacheKey, result, 15);
    return result;
}

// ─── 2. Trend Data ────────────────────────────────────────────────────────────

/**
 * Session/failure/credit totals grouped by the appropriate time bucket.
 * Auto-selects granularity: hourly (<2d), daily (<90d), weekly (<1y), monthly.
 * @param {object} [query]
 */
export async function getTrendData(query = {}) {
  const { dateMatch, start } = parseDateRange(query);
  const cacheKey = `trend:${JSON.stringify(dateMatch)}`;
    const cached = await CacheService.get(cacheKey);
  if (cached) return cached;

  const now     = new Date();
  const spanMs  = start ? (now - start) : (365 * 86_400_000);
  const spanDays = spanMs / 86_400_000;

  let fmt, groupBy;
  if      (spanDays <= 2)   { fmt = "%Y-%m-%d %H:00"; groupBy = "hour";  }
  else if (spanDays <= 90)  { fmt = "%Y-%m-%d";        groupBy = "day";   }
  else if (spanDays <= 366) { fmt = "%Y-%W";           groupBy = "week";  }
  else                      { fmt = "%Y-%m";           groupBy = "month"; }

  const rows = await GameSession.aggregate([
    { $match: { ...dateMatch } },
    {
      $group: {
        _id:         { $dateToString: { format: fmt, date: "$createdAt" } },
        sessions:    { $sum: 1 },
        failures:    { $sum: { $cond: [{ $eq: ["$status","failed"] }, 1, 0] } },
        credits:     { $sum: "$billing.creditsConsumed" },
        crashes:     { $sum: { $cond: [{ $eq: ["$exitReason","crash"] }, 1, 0] } },
        disconnects: { $sum: { $cond: [{ $eq: ["$exitReason","disconnect"] }, 1, 0] } },
        playTime:    { $sum: "$metrics.totalPlayTime" },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 500 },
  ]);

  const result = { groupBy, rows: rows.map((r) => ({ ...r, date: r._id, _id: undefined })) };
    await CacheService.set(cacheKey, result, 60);
    return result;
}

// ─── 3. Exit Reason Analytics ─────────────────────────────────────────────────

/**
 * @param {object} [query]
 */
export async function getExitReasonStats(query = {}) {
  const { dateMatch, start, end } = parseDateRange(query);
  const { prevStart, prevEnd }    = getPreviousPeriod(start, end);

  const prevMatch = (prevStart || prevEnd) ? {
    exitReason: { $exists: true, $ne: null },
    endedAt: {
      ...(prevStart ? { $gte: prevStart } : {}),
      ...(prevEnd   ? { $lte: prevEnd   } : {}),
    },
  } : {};

  const currentMatch = {
    exitReason: { $exists: true, $ne: null },
    ...( (start || end) ? {
      endedAt: {
        ...(start ? { $gte: start } : {}),
        ...(end   ? { $lte: end   } : {}),
      },
    } : {}),
  };

  const [current, previous] = await Promise.all([
    GameSession.aggregate([
      { $match: currentMatch },
      { $group: { _id: "$exitReason", count: { $sum: 1 } } },
    ]),
    Object.keys(prevMatch).length
      ? GameSession.aggregate([
          { $match: prevMatch },
          { $group: { _id: "$exitReason", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
  ]);

  const prevMap = {};
  previous.forEach((p) => { prevMap[p._id] = p.count; });
  const total = current.reduce((acc, c) => acc + c.count, 0);

  return current
    .map((c) => {
      const prev  = prevMap[c._id] ?? 0;
      const trend = prev > 0 ? parseFloat((((c.count - prev) / prev) * 100).toFixed(1)) : 0;
      return {
        reason: c._id,
        count:  c.count,
        pct:    total > 0 ? parseFloat(((c.count / total) * 100).toFixed(1)) : 0,
        trend,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// ─── 4. Session Explorer (paginated) ─────────────────────────────────────────

/**
 * @param {object} params
 */
export async function listSessions({
  page       = 1,
  pageSize   = 20,
  search,
  sortBy     = "createdAt",
  sortDir    = "desc",
  status,
  phase,
  exitReason,
  queueType,
  region,
  userId,
  gameId,
  dateFrom,
  dateTo,
  range,
  minCredits,
  maxCredits,
  minDuration,
  maxDuration,
} = {}) {
  // Build date match from explicit dateFrom/dateTo or range param
  const { dateMatch } = parseDateRange({ range, from: dateFrom, to: dateTo });

  const match = { ...dateMatch };

  if (status     && status     !== "all") match.status         = status;
  if (phase      && phase      !== "all") match.phase          = phase;
  if (exitReason && exitReason !== "all") match.exitReason     = exitReason;
  if (queueType  && queueType  !== "all") match.queueType      = queueType;
  if (region)   match.instanceRegion = region;
  if (userId)   match.user           = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
  if (gameId)   match.gamePost       = mongoose.Types.ObjectId.isValid(gameId) ? new mongoose.Types.ObjectId(gameId) : gameId;

  if (minCredits || maxCredits) {
    match["billing.creditsConsumed"] = {
      ...(minCredits ? { $gte: Number(minCredits) } : {}),
      ...(maxCredits ? { $lte: Number(maxCredits) } : {}),
    };
  }

  const basePipeline = [
    { $match: match },
    {
      $lookup: {
        from:       "users",
        localField: "user",
        foreignField:"_id",
        as:         "userDoc",
        pipeline:   [{ $project: { username: 1, email: 1 } }],
      },
    },
    {
      $lookup: {
        from:       "allposts",
        localField: "gamePost",
        foreignField:"_id",
        as:         "gameDoc",
        pipeline:   [{ $project: { "gamePost.gameName": 1 } }],
      },
    },
    {
      $project: {
        user:      { $arrayElemAt: ["$userDoc", 0] },
        game:      { $arrayElemAt: ["$gameDoc.gamePost.gameName", 0] },
        status:    1, phase: 1, queueType: 1,
        region:    "$instanceRegion",
        startedAt: 1, endedAt: 1, createdAt: 1,
        totalPlayTime: "$metrics.totalPlayTime",
        duration: {
          $cond: [
            { $and: ["$startedAt","$endedAt"] },
            { $subtract: ["$endedAt","$startedAt"] },
            { $cond: ["$startedAt", { $subtract: [new Date(),"$startedAt"] }, 0] },
          ],
        },
        credits:    "$billing.creditsConsumed",
        exitReason: 1,
        instanceId: 1,
        instanceIp: 1,
      },
    },
  ];

  // Duration filter (post-project)
  if (minDuration || maxDuration) {
    basePipeline.push({
      $match: {
        duration: {
          ...(minDuration ? { $gte: Number(minDuration) } : {}),
          ...(maxDuration ? { $lte: Number(maxDuration) } : {}),
        },
      },
    });
  }

  if (search) {
    basePipeline.push({
      $match: {
        $or: [
          { "user.username": { $regex: search, $options: "i" } },
          { game:            { $regex: search, $options: "i" } },
          { instanceId:      { $regex: search, $options: "i" } },
          ...(mongoose.Types.ObjectId.isValid(search)
            ? [{ _id: new mongoose.Types.ObjectId(search) }]
            : []),
        ],
      },
    });
  }

  const [countResult, rows] = await Promise.all([
    GameSession.aggregate([...basePipeline, { $count: "total" }]),
    GameSession.aggregate([
      ...basePipeline,
      { $sort: { [sortBy]: sortDir === "asc" ? 1 : -1 } },
      { $skip:  (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
  ]);

  const total = countResult[0]?.total ?? 0;
  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─── 5. Session Detail ────────────────────────────────────────────────────────

export async function getSessionDetail(sessionId) {
  if (!mongoose.Types.ObjectId.isValid(sessionId)) return null;

  const rows = await GameSession.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(sessionId) } },
    {
      $lookup: {
        from:       "users",
        localField: "user",
        foreignField:"_id",
        as:         "userDoc",
        pipeline:   [{ $project: { username: 1, email: 1 } }],
      },
    },
    {
      $lookup: {
        from:       "allposts",
        localField: "gamePost",
        foreignField:"_id",
        as:         "gameDoc",
        pipeline:   [{ $project: { "gamePost.gameName": 1, user: 1 } }],
      },
    },
    {
      $lookup: {
        from:       "users",
        localField: "gameDoc.user",
        foreignField:"_id",
        as:         "creatorDoc",
        pipeline:   [{ $project: { username: 1 } }],
      },
    },
    {
      $project: {
        user:    { $arrayElemAt: ["$userDoc", 0] },
        game:    { $arrayElemAt: ["$gameDoc.gamePost.gameName", 0] },
        gameId:  "$gamePost",
        creator: { $arrayElemAt: ["$creatorDoc.username", 0] },
        status:  1, phase: 1, queueType: 1,
        region:  "$instanceRegion",
        createdAt: 1, startedAt: 1, endedAt: 1, lastHeartbeat: 1,
        duration: {
          $cond: [
            { $and: ["$startedAt","$endedAt"] },
            { $subtract: ["$endedAt","$startedAt"] },
            { $cond: ["$startedAt", { $subtract: [new Date(),"$startedAt"] }, 0] },
          ],
        },
        credits:       "$billing.creditsConsumed",
        exitReason:    1, exitCode: 1, error: 1,
        instanceId:    1, instanceIp: 1,
        leaseToken:    1, leaseExpiresAt: 1,
        billing:       1, metrics: 1,
        countdownStartedAt: 1, countdownSeconds: 1,
      },
    },
  ]);

  return rows[0] ?? null;
}

// ─── 6. Game Health ───────────────────────────────────────────────────────────

export async function getGameHealthStats(query = {}) {
  const { dateMatch, start, end } = parseDateRange(query);
  const { prevStart, prevEnd }    = getPreviousPeriod(start, end);

  const cacheKey = `gameHealth:${JSON.stringify(dateMatch)}`;
    const cached = await CacheService.get(cacheKey);
  if (cached) return cached;

  const prevDateMatch = (prevStart || prevEnd) ? {
    createdAt: {
      ...(prevStart ? { $gte: prevStart } : {}),
      ...(prevEnd   ? { $lte: prevEnd   } : {}),
    },
  } : {};

  const [results, prevResults] = await Promise.all([
    GameSession.aggregate([
      { $match: { ...dateMatch } },
      {
        $group: {
          _id:            "$gamePost",
          totalSessions:  { $sum: 1 },
          activeSessions: { $sum: { $cond: [{ $in: ["$status",["waiting","starting","running","allocation_ready"]] }, 1, 0] } },
          avgDuration:    { $avg: { $cond: [{ $and: ["$startedAt","$endedAt"] }, { $subtract: ["$endedAt","$startedAt"] }, null] } },
          totalPlayTime:  { $sum: "$metrics.totalPlayTime" },
          creditsBurned:  { $sum: "$billing.creditsConsumed" },
          failures:       { $sum: { $cond: [{ $eq: ["$status",    "failed"]     }, 1, 0] } },
          crashes:        { $sum: { $cond: [{ $eq: ["$exitReason","crash"]      }, 1, 0] } },
          disconnects:    { $sum: { $cond: [{ $eq: ["$exitReason","disconnect"] }, 1, 0] } },
          directCount:    { $sum: { $cond: [{ $eq: ["$queueType", "direct"]    }, 1, 0] } },
          queuedCount:    { $sum: { $cond: [{ $eq: ["$queueType", "queued"]    }, 1, 0] } },
          uniquePlayers:  { $addToSet: "$user" },
        },
      },
      {
        $lookup: {
          from:       "allposts",
          localField: "_id",
          foreignField:"_id",
          as:         "gameDoc",
          pipeline:   [{ $project: { user: 1, "gamePost.gameName": 1 } }],
        },
      },
      { $unwind: { path: "$gameDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from:       "users",
          localField: "gameDoc.user",
          foreignField:"_id",
          as:         "creatorDoc",
          pipeline:   [{ $project: { username: 1 } }],
        },
      },
      { $unwind: { path: "$creatorDoc", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          failureRate:    { $cond: [{ $gt: ["$totalSessions",0] }, { $multiply: [{ $divide: ["$failures",   "$totalSessions"] }, 100] }, 0] },
          crashRate:      { $cond: [{ $gt: ["$totalSessions",0] }, { $multiply: [{ $divide: ["$crashes",    "$totalSessions"] }, 100] }, 0] },
          disconnectRate: { $cond: [{ $gt: ["$totalSessions",0] }, { $multiply: [{ $divide: ["$disconnects","$totalSessions"] }, 100] }, 0] },
        },
      },
      { $sort: { activeSessions: -1 } },
      { $limit: 200 },
    ]),

    Object.keys(prevDateMatch).length
      ? GameSession.aggregate([
          { $match: prevDateMatch },
          {
            $group: {
              _id:           "$gamePost",
              totalSessions: { $sum: 1 },
              failures:      { $sum: { $cond: [{ $eq: ["$status","failed"] }, 1, 0] } },
            },
          },
        ])
      : Promise.resolve([]),
  ]);

  const prevMap = {};
  prevResults.forEach((p) => { prevMap[p._id?.toString()] = p; });

  const mapped = results.map((r) => {
    const prevR   = prevMap[r._id?.toString()] ?? {};
    const prevSessions  = prevR.totalSessions ?? 0;
    const prevFailures  = prevR.failures      ?? 0;
    const sessionTrend  = prevSessions > 0 ? parseFloat((((r.totalSessions - prevSessions) / prevSessions) * 100).toFixed(1)) : 0;
    const prevFailRate  = prevSessions > 0 ? (prevFailures / prevSessions) * 100 : 0;
    const failureTrend  = prevFailRate  > 0 ? parseFloat((((r.failureRate - prevFailRate) / prevFailRate) * 100).toFixed(1)) : 0;
    const score = calculateHealthScore({
  failureRate: r.failureRate ?? 0,
  crashRate: r.crashRate ?? 0,
  disconnectRate: r.disconnectRate ?? 0,
  totalSessions: r.totalSessions ?? 0,
});

    return {
      _id:             r._id?.toString(),
      gameName:        r.gameDoc?.gamePost?.gameName ?? "Unknown",
      creator:         r.creatorDoc?.username        ?? "—",
      activeSessions:  r.activeSessions,
      totalSessions:   r.totalSessions,
      uniquePlayers:   r.uniquePlayers?.length ?? 0,
      avgDuration:     Math.round(r.avgDuration  ?? 0),
      totalPlayTime:   r.totalPlayTime,
      creditsBurned:   r.creditsBurned,
      avgCreditsPerSession: r.totalSessions > 0 ? Math.round(r.creditsBurned / r.totalSessions) : 0,
      avgPlayTimePerPlayer: r.uniquePlayers?.length > 0 ? Math.round((r.totalPlayTime ?? 0) / r.uniquePlayers.length) : 0,
      avgCreditsPerPlayer:  r.uniquePlayers?.length > 0 ? Math.round(r.creditsBurned / r.uniquePlayers.length) : 0,
      failureRate:     parseFloat((r.failureRate    ?? 0).toFixed(1)),
      crashRate:       parseFloat((r.crashRate      ?? 0).toFixed(1)),
      disconnectRate:  parseFloat((r.disconnectRate ?? 0).toFixed(1)),
      queueUsage:      { direct: r.directCount, queued: r.queuedCount },
      sessionTrend,
      failureTrend,
      healthScore:     score,
      healthStatus:    scoreToHealth(score),

    };
  });

    await CacheService.set(cacheKey, mapped, 30);
    return mapped;
}

// ─── 7. Game Investigation (single game sessions) ─────────────────────────────

export async function getGameSessionsDetail(gameId, query = {}, { page = 1, pageSize = 20 } = {}) {
  if (!mongoose.Types.ObjectId.isValid(gameId)) return null;

  const { dateMatch } = parseDateRange(query);
  const match = { ...dateMatch, gamePost: new mongoose.Types.ObjectId(gameId) };

  const [summary, countResult, rows] = await Promise.all([
    GameSession.aggregate([
      { $match: match },
      {
        $group: {
          _id:           null,
          totalSessions: { $sum: 1 },
          uniquePlayers: { $addToSet: "$user" },
          totalCredits:  { $sum: "$billing.creditsConsumed" },
          totalPlayTime: { $sum: "$metrics.totalPlayTime" },
          failures:      { $sum: { $cond: [{ $eq: ["$status","failed"] }, 1, 0] } },
          crashes:       { $sum: { $cond: [{ $eq: ["$exitReason","crash"] }, 1, 0] } },
          disconnects:   { $sum: { $cond: [{ $eq: ["$exitReason","disconnect"] }, 1, 0] } },
        },
      },
    ]),
    GameSession.aggregate([
      { $match: match },
      { $count: "total" },
    ]),
    GameSession.aggregate([
      { $match: match },
      {
        $lookup: {
          from:       "users",
          localField: "user",
          foreignField:"_id",
          as:         "userDoc",
          pipeline:   [{ $project: { username: 1 } }],
        },
      },
      {
        $project: {
          user:      { $arrayElemAt: ["$userDoc", 0] },
          status:    1,
          duration:  {
            $cond: [
              { $and: ["$startedAt","$endedAt"] },
              { $subtract: ["$endedAt","$startedAt"] },
              0,
            ],
          },
          credits:    "$billing.creditsConsumed",
          exitReason: 1,
          startedAt:  1,
          endedAt:    1,
        },
      },
      { $sort: { startedAt: -1 } },
      { $skip:  (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
  ]);

  const s = summary[0] ?? {};
  const total = countResult[0]?.total ?? 0;

  return {
    summary: {
      totalSessions:  s.totalSessions    ?? 0,
      uniquePlayers:  s.uniquePlayers?.length ?? 0,
      totalCredits:   s.totalCredits     ?? 0,
      totalPlayTime:  s.totalPlayTime    ?? 0,
      failureRate:    s.totalSessions > 0 ? parseFloat(((s.failures    / s.totalSessions) * 100).toFixed(1)) : 0,
      crashRate:      s.totalSessions > 0 ? parseFloat(((s.crashes     / s.totalSessions) * 100).toFixed(1)) : 0,
      disconnectRate: s.totalSessions > 0 ? parseFloat(((s.disconnects / s.totalSessions) * 100).toFixed(1)) : 0,
    },
    sessions: { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  };
}

// ─── 8. User Session Summary ──────────────────────────────────────────────────

export async function getUserSessionSummary(userId, query = {}) {
  const objectId      = new mongoose.Types.ObjectId(userId);
  const { dateMatch } = parseDateRange(query);
  const match         = { ...dateMatch, user: objectId };

  const [summaryResult, recentSessions, gameFrequency, regionFrequency] = await Promise.all([
    GameSession.aggregate([
      { $match: match },
      {
        $group: {
          _id:             null,
          totalSessions:   { $sum: 1 },
          totalPlayTime:   { $sum: "$metrics.totalPlayTime" },
          creditsConsumed: { $sum: "$billing.creditsConsumed" },
          failures:        { $sum: { $cond: [{ $eq: ["$status","failed"]     }, 1, 0] } },
          disconnects:     { $sum: { $cond: [{ $eq: ["$exitReason","disconnect"] }, 1, 0] } },
          avgDuration: {
            $avg: {
              $cond: [
                { $and: ["$startedAt","$endedAt"] },
                { $subtract: ["$endedAt","$startedAt"] },
                null,
              ],
            },
          },
        },
      },
    ]),
    // All sessions in range (paginated externally; we return 50 here)
    GameSession.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from:       "allposts",
          localField: "gamePost",
          foreignField:"_id",
          as:         "gameDoc",
          pipeline:   [{ $project: { "gamePost.gameName": 1 } }],
        },
      },
      {
        $project: {
          game:       { $arrayElemAt: ["$gameDoc.gamePost.gameName", 0] },
          status:     1, phase: 1, queueType: 1,
          region:     "$instanceRegion",
          startedAt:  1, endedAt: 1,
          duration: {
            $cond: [
              { $and: ["$startedAt","$endedAt"] },
              { $subtract: ["$endedAt","$startedAt"] },
              0,
            ],
          },
          credits:    "$billing.creditsConsumed",
          exitReason: 1, instanceId: 1, instanceIp: 1,
        },
      },
    ]),
    // Favorite games
    GameSession.aggregate([
      { $match: match },
      { $group: { _id: "$gamePost", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:       "allposts",
          localField: "_id",
          foreignField:"_id",
          as:         "gameDoc",
          pipeline:   [{ $project: { "gamePost.gameName": 1 } }],
        },
      },
      {
        $project: {
          gameName: { $arrayElemAt: ["$gameDoc.gamePost.gameName", 0] },
          count:    1,
        },
      },
    ]),
    // Most active region
    GameSession.aggregate([
      { $match: { ...match, instanceRegion: { $exists: true, $ne: null } } },
      { $group: { _id: "$instanceRegion", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const s = summaryResult[0] ?? {};
  const failureRate = s.totalSessions > 0 ? parseFloat(((s.failures / s.totalSessions) * 100).toFixed(1)) : 0;

  return {
    user: { _id: userId, username: "", email: "" }, // populated by controller
    summary: {
      totalSessions:     s.totalSessions    ?? 0,
      totalPlayTime:     s.totalPlayTime    ?? 0,
      creditsConsumed:   s.creditsConsumed  ?? 0,
      avgSessionDuration:Math.round(s.avgDuration ?? 0),
      failures:          s.failures         ?? 0,
      disconnects:       s.disconnects      ?? 0,
      failureRate,
      successRate: parseFloat((100 - failureRate).toFixed(1)),
    },
    favoriteGames:   gameFrequency,
    mostActiveRegion:regionFrequency[0]?._id ?? null,
    regionBreakdown: regionFrequency,
    recentSessions,
  };
}

// ─── 9. Failure Investigation ─────────────────────────────────────────────────

export async function getFailureStats(query = {}) {
  const { dateMatch, start, end } = parseDateRange(query);
  const { prevStart, prevEnd }    = getPreviousPeriod(start, end);

  const baseMatch = {
    ...dateMatch,
    status: "failed",
    ...(query.game   ? { gamePost:       mongoose.Types.ObjectId.isValid(query.game)   ? new mongoose.Types.ObjectId(query.game)   : null } : {}),
    ...(query.region ? { instanceRegion: query.region } : {}),
    ...(query.exitReason && query.exitReason !== "all" ? { exitReason: query.exitReason } : {}),
  };

  const page     = parseInt(query.page)     || 1;
  const pageSize = parseInt(query.pageSize) || 50;

  const [trendData, countResult, rows, prevTrend] = await Promise.all([
    // Trend by failure type
    GameSession.aggregate([
      { $match: { ...dateMatch, status: "failed" } },
      {
        $group: {
          _id:       { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          crashes:   { $sum: { $cond: [{ $eq: ["$exitReason","crash"] },             1, 0] } },
          disconnects:{ $sum: { $cond: [{ $eq: ["$exitReason","disconnect"] },         1, 0] } },
          timeouts:  { $sum: { $cond: [{ $eq: ["$exitReason","timeout"] },            1, 0] } },
          abandoned: { $sum: { $cond: [{ $in: ["$exitReason",["user_abandoned","stale_abandoned"]] }, 1, 0] } },
          countdownExpired: { $sum: { $cond: [{ $eq: ["$exitReason","countdown_expired"] }, 1, 0] } },
          creditExhausted:  { $sum: { $cond: [{ $eq: ["$exitReason","credits_exhausted"] }, 1, 0] } },
          total:     { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    GameSession.aggregate([...buildFailurePipeline(baseMatch), { $count: "total" }]),

    GameSession.aggregate([
      ...buildFailurePipeline(baseMatch),
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]),

    // Previous period totals for trend indicators
    (prevStart || prevEnd) ? GameSession.aggregate([
      { $match: { status: "failed", createdAt: { ...(prevStart ? { $gte: prevStart } : {}), ...(prevEnd ? { $lte: prevEnd } : {}) } } },
      {
        $group: {
          _id:      null,
          crashes:  { $sum: { $cond: [{ $eq: ["$exitReason","crash"] }, 1, 0] } },
          total:    { $sum: 1 },
        },
      },
    ]) : Promise.resolve([]),
  ]);

  const total = countResult[0]?.total ?? 0;

  return {
    trend: trendData.map((r) => ({ ...r, date: r._id, _id: undefined })),
    sessions: { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  };
}

function buildFailurePipeline(match) {
  return [
    { $match: match },
    {
      $lookup: {
        from:       "users",
        localField: "user",
        foreignField:"_id",
        as:         "userDoc",
        pipeline:   [{ $project: { username: 1 } }],
      },
    },
    {
      $lookup: {
        from:       "allposts",
        localField: "gamePost",
        foreignField:"_id",
        as:         "gameDoc",
        pipeline:   [{ $project: { "gamePost.gameName": 1 } }],
      },
    },
    {
      $project: {
        user:       { $arrayElemAt: ["$userDoc", 0] },
        game:       { $arrayElemAt: ["$gameDoc.gamePost.gameName", 0] },
        exitReason: 1,
        error:      1,
        credits:    "$billing.creditsConsumed",
        region:     "$instanceRegion",
        createdAt:  1,
      },
    },
  ];
}

// ─── 10. Region Analytics ─────────────────────────────────────────────────────

export async function getRegionStats(query = {}) {
  const { dateMatch, start, end } = parseDateRange(query);
  const { prevStart, prevEnd }    = getPreviousPeriod(start, end);

  const cacheKey = `regions:${JSON.stringify(dateMatch)}`;
    const cached = await CacheService.get(cacheKey);
  if (cached) return cached;

  const [results, prevResults] = await Promise.all([
    GameSession.aggregate([
      { $match: { ...dateMatch, instanceRegion: { $exists: true, $ne: null } } },
      {
        $group: {
          _id:           "$instanceRegion",
          sessions:      { $sum: 1 },
          failures:      { $sum: { $cond: [{ $eq: ["$status","failed"] }, 1, 0] } },
          avgDuration:   { $avg: { $cond: [{ $and: ["$startedAt","$endedAt"] }, { $subtract: ["$endedAt","$startedAt"] }, null] } },
          creditsBurned: { $sum: "$billing.creditsConsumed" },
          totalPlayTime: { $sum: "$metrics.totalPlayTime" },
          uniquePlayers: { $addToSet: "$user" },
          uniqueGames:   { $addToSet: "$gamePost" },
        },
      },
      { $sort: { sessions: -1 } },
    ]),
    (prevStart || prevEnd) ? GameSession.aggregate([
      { $match: { instanceRegion: { $exists: true, $ne: null }, createdAt: { ...(prevStart ? { $gte: prevStart } : {}), ...(prevEnd ? { $lte: prevEnd } : {}) } } },
      { $group: { _id: "$instanceRegion", sessions: { $sum: 1 } } },
    ]) : Promise.resolve([]),
  ]);

  const prevMap = {};
  prevResults.forEach((p) => { prevMap[p._id] = p.sessions; });

  const mapped = results.map((r) => ({
    region:        r._id,
    sessions:      r.sessions,
    failures:      r.failures,
    failureRate:   r.sessions > 0 ? parseFloat(((r.failures / r.sessions) * 100).toFixed(1)) : 0,
    avgDuration:   Math.round(r.avgDuration   ?? 0),
    creditsBurned: r.creditsBurned,
    totalPlayTime: r.totalPlayTime ?? 0,
    activePlayers: r.uniquePlayers?.length ?? 0,
    activeGames:   r.uniqueGames?.length   ?? 0,
    sessionTrend:  prevMap[r._id] > 0 ? parseFloat((((r.sessions - prevMap[r._id]) / prevMap[r._id]) * 100).toFixed(1)) : 0,
  }));

    await CacheService.set(cacheKey, mapped, 30);
    return mapped;
}

// ─── 11. Queue Analytics ─────────────────────────────────────────────────────

export async function getQueueStats(query = {}) {
  const { dateMatch } = parseDateRange(query);

  const [queueLength, stats, trendData] = await Promise.all([
    GameSession.countDocuments({ status: "waiting" }),
    GameSession.aggregate([
      {
        $match: {
          ...dateMatch,
          queueType: "queued",
          startedAt: { $exists: true },
          createdAt: { $exists: true },
        },
      },
      {
        $group: {
          _id:         null,
          avgWaitTime: { $avg: { $subtract: ["$startedAt","$createdAt"] } },
          maxWaitTime: { $max: { $subtract: ["$startedAt","$createdAt"] } },
          total:       { $sum: 1 },
          converted:   { $sum: { $cond: [{ $eq: ["$status","ended"] }, 1, 0] } },
          abandoned: {
            $sum: {
              $cond: [
                { $in: ["$exitReason",["user_abandoned","stale_abandoned","countdown_expired"]] },
                1, 0,
              ],
            },
          },
        },
      },
    ]),
    // Queue volume trend
    GameSession.aggregate([
      { $match: { ...dateMatch, queueType: "queued" } },
      {
        $group: {
          _id:       { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          queued:    { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$status","ended"] }, 1, 0] } },
          abandoned: { $sum: { $cond: [{ $in: ["$exitReason",["user_abandoned","stale_abandoned","countdown_expired"]] }, 1, 0] } },
          avgWait:   { $avg: { $subtract: ["$startedAt","$createdAt"] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const s = stats[0] ?? {};
  const successRate  = s.total > 0 ? ((s.total - s.abandoned) / s.total) * 100 : 100;
  const abandonRate  = s.total > 0 ? (s.abandoned / s.total) * 100 : 0;
  const convRate     = s.total > 0 ? (s.converted / s.total) * 100 : 0;

  return {
    currentLength:     queueLength,
    totalQueued:       s.total        ?? 0,
    avgWaitTime:       Math.round(s.avgWaitTime  ?? 0),
    maxWaitTime:       Math.round(s.maxWaitTime  ?? 0),
    successRate:       parseFloat(successRate.toFixed(1)),
    abandonmentRate:   parseFloat(abandonRate.toFixed(1)),
    conversionRate:    parseFloat(convRate.toFixed(1)),
    trend: trendData.map((r) => ({ ...r, date: r._id, _id: undefined })),
  };
}