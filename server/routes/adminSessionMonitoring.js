// src/routes/adminSessionMonitoring.js


import { Router }        from "express";
import GameSession       from "../models/GameSession.js";
import User              from "../models/User.js";
import * as SessionService from "../services/sessionMonitoring.js";
import verifyToken       from "../middlewares/authMiddleware.js";
import requireAdmin      from "../middlewares/adminMiddleware.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok  = (res, data, status = 200) => res.status(status).json({ success: true,  data });
const err = (res, msg,  status = 500) => res.status(status).json({ success: false, message: msg });
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();
router.use(verifyToken, requireAdmin);

// ── Health Overview ──────────────────────────────────────────────────────────

/**
 * GET /sessions/overview
 * Extended KPI snapshot for the selected date range.
 * Query: ?range=today|7d|30d|thisMonth|lastMonth|3m|6m|thisYear|all
 *        ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Recommended poll interval: 10s
 */
router.get("/sessions/overview", wrap(async (req, res) => {
  const data = await SessionService.getSessionOverview(req.query);
  ok(res, data);
}));

/**
 * GET /sessions/trend
 * Grouped trend data with auto-selected granularity.
 * Same range params as overview.
 */
router.get("/sessions/trend", wrap(async (req, res) => {
  const data = await SessionService.getTrendData(req.query);
  ok(res, data);
}));

// ── Session Outcomes ─────────────────────────────────────────────────────────

/**
 * GET /sessions/exit-reasons
 * Exit reason distribution with period-over-period trend.
 */
router.get("/sessions/exit-reasons", wrap(async (req, res) => {
  const data = await SessionService.getExitReasonStats(req.query);
  ok(res, data);
}));

// ── Live Monitor (no date filter) ─────────────────────────────────────────────

/**
 * GET /sessions/live
 * Real-time active sessions snapshot. No date filter applied.
 * Recommended poll interval: 5s
 */
router.get("/sessions/live", wrap(async (_req, res) => {
  const sessions = await GameSession.aggregate([
    {
      $match: {
        status: { $in: ["waiting","allocation_ready","starting","running"] },
      },
    },
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
      },
    },
    { $unwind: { path: "$gameDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id:      1,
        user:     { $arrayElemAt: ["$userDoc", 0] },
        game:     "$gameDoc.gamePost.gameName",
        status:   1, phase: 1, queueType: 1,
        region:   "$instanceRegion",
        startedAt:1, endedAt: 1,
        instanceId:1, instanceIp: 1,
        credits:  "$billing.creditsConsumed",
        duration: {
          $cond: [
            "$startedAt",
            { $subtract: [new Date(), "$startedAt"] },
            0,
          ],
        },
      },
    },
    { $sort: { startedAt: -1 } },
  ]);

  const result = { running: [], starting: [], allocationReady: [], waiting: [] };
  for (const s of sessions) {
    if      (s.status === "running")          result.running.push(s);
    else if (s.status === "starting")         result.starting.push(s);
    else if (s.status === "allocation_ready") result.allocationReady.push(s);
    else if (s.status === "waiting")          result.waiting.push(s);
  }

  ok(res, result);
}));

// ── Session Explorer ──────────────────────────────────────────────────────────

/**
 * GET /sessions
 * Paginated session list with full filters.
 *
 * Query: page, pageSize, search, sortBy, sortDir,
 *        status, phase, exitReason, queueType, region,
 *        userId, gameId, range, dateFrom, dateTo,
 *        minCredits, maxCredits, minDuration, maxDuration
 */
router.get("/sessions", wrap(async (req, res) => {
  const params = {
    page:        parseInt(req.query.page)     || 1,
    pageSize:    parseInt(req.query.pageSize) || 20,
    search:      req.query.search      || undefined,
    sortBy:      req.query.sortBy      || "createdAt",
    sortDir:     req.query.sortDir     || "desc",
    status:      req.query.status      || undefined,
    phase:       req.query.phase       || undefined,
    exitReason:  req.query.exitReason  || undefined,
    queueType:   req.query.queueType   || undefined,
    region:      req.query.region      || undefined,
    userId:      req.query.userId      || undefined,
    gameId:      req.query.gameId      || undefined,
    range:       req.query.range       || undefined,
    dateFrom:    req.query.dateFrom    || undefined,
    dateTo:      req.query.dateTo      || undefined,
    minCredits:  req.query.minCredits  || undefined,
    maxCredits:  req.query.maxCredits  || undefined,
    minDuration: req.query.minDuration || undefined,
    maxDuration: req.query.maxDuration || undefined,
  };
  const result = await SessionService.listSessions(params);
  ok(res, result);
}));

// ── Session Detail ────────────────────────────────────────────────────────────

/**
 * GET /sessions/:id
 * Full session detail including billing, metrics, lease info, creator.
 */
router.get("/sessions/:id", wrap(async (req, res) => {
  const session = await SessionService.getSessionDetail(req.params.id);
  if (!session) return err(res, "Session not found", 404);
  ok(res, session);
}));

// ── Admin Actions (kept from original; UI commented out pending full support) ─

router.post("/sessions/:id/end", wrap(async (req, res) => {
  const session = await GameSession.findById(req.params.id);
  if (!session) return err(res, "Session not found", 404);
  session.status = "ended"; session.exitReason = "admin_terminated"; session.endedAt = new Date();
  await session.save();
  ok(res, { message: "Session ended" });
}));

router.post("/sessions/:id/force-fail", wrap(async (req, res) => {
  const session = await GameSession.findById(req.params.id);
  if (!session) return err(res, "Session not found", 404);
  session.status = "failed"; session.exitReason = "admin_force_fail"; session.error = "Forced by admin"; session.endedAt = new Date();
  await session.save();
  ok(res, { message: "Session failed" });
}));

router.post("/sessions/:id/requeue", wrap(async (req, res) => {
  const session = await GameSession.findById(req.params.id);
  if (!session) return err(res, "Session not found", 404);
  session.status = "waiting"; session.phase = null; session.startedAt = null; session.endedAt = null; session.exitReason = null;
  await session.save();
  ok(res, { message: "Session requeued" });
}));

router.post("/sessions/:id/release-instance", wrap(async (req, res) => {
  const session = await GameSession.findById(req.params.id);
  if (!session) return err(res, "Session not found", 404);
  const released = { instanceId: session.instanceId, instanceIp: session.instanceIp };
  session.instanceId = null; session.instanceIp = null; session.leaseToken = null; session.leaseExpiresAt = null;
  await session.save();
  ok(res, { message: "Instance released", releasedInstance: released });
}));

// ── Game Health ───────────────────────────────────────────────────────────────

/**
 * GET /games/health
 * Per-game aggregate health stats for the selected period.
 */
router.get("/games/health", wrap(async (req, res) => {
  const data = await SessionService.getGameHealthStats(req.query);
  ok(res, data);
}));

/**
 * GET /games/:gameId/health
 * Single game health record.
 */
router.get("/games/:gameId/health", wrap(async (req, res) => {
  const all  = await SessionService.getGameHealthStats(req.query);
  const game = all.find((g) => g._id === req.params.gameId);
  if (!game) return err(res, "Game not found", 404);
  ok(res, game);
}));

/**
 * GET /games/:gameId/sessions
 * All sessions for a game in the selected period (paginated).
 */
router.get("/games/:gameId/sessions", wrap(async (req, res) => {
  const result = await SessionService.getGameSessionsDetail(
    req.params.gameId,
    req.query,
    { page: parseInt(req.query.page) || 1, pageSize: parseInt(req.query.pageSize) || 20 }
  );
  if (!result) return err(res, "Game not found", 404);
  ok(res, result);
}));

// ── Failure Investigation ─────────────────────────────────────────────────────

/**
 * GET /failures
 * Failed sessions with trend data. Supports full range + game/region/exitReason filters.
 */
router.get("/failures", wrap(async (req, res) => {
  const data = await SessionService.getFailureStats(req.query);
  ok(res, data);
}));

// ── User Investigation ────────────────────────────────────────────────────────

/**
 * GET /users/:userId/summary
 * Aggregate summary for a user in the selected date range.
 * Accepts ObjectId or username.
 */
router.get("/users/:userId/summary", wrap(async (req, res) => {
  const { userId } = req.params;
  let userDoc = null;
  if (/^[a-f\d]{24}$/i.test(userId)) userDoc = await User.findById(userId).select("username email").lean();
  if (!userDoc) userDoc = await User.findOne({ username: userId }).select("username email").lean();
  if (!userDoc) return err(res, "User not found", 404);

  const resolvedId = userDoc._id.toString();
  const summary    = await SessionService.getUserSessionSummary(resolvedId, req.query);
  summary.user     = { _id: resolvedId, username: userDoc.username, email: userDoc.email };
  ok(res, summary);
}));

/**
 * GET /users/:userId/sessions
 * Paginated sessions for a user in the selected range.
 */
router.get("/users/:userId/sessions", wrap(async (req, res) => {
  const params = {
    userId:   req.params.userId,
    page:     parseInt(req.query.page)     || 1,
    pageSize: parseInt(req.query.pageSize) || 20,
    range:    req.query.range    || undefined,
    dateFrom: req.query.dateFrom || undefined,
    dateTo:   req.query.dateTo   || undefined,
    sortBy:   "createdAt",
    sortDir:  "desc",
  };
  const result = await SessionService.listSessions(params);
  ok(res, result);
}));

// ── Region Analytics ──────────────────────────────────────────────────────────

/**
 * GET /regions
 * Per-region stats for the selected period.
 */
router.get("/regions", wrap(async (req, res) => {
  const data = await SessionService.getRegionStats(req.query);
  ok(res, data);
}));

// ── Queue Analytics ───────────────────────────────────────────────────────────

/**
 * GET /queue
 * Queue metrics + trend for the selected period.
 */
router.get("/queue", wrap(async (req, res) => {
  const data = await SessionService.getQueueStats(req.query);
  ok(res, data);
}));

// ─── Error Handler ────────────────────────────────────────────────────────────

export function sessionMonitoringErrorHandler(error, _req, res, _next) {
  console.error("[SessionMonitoring]", error);
  res.status(500).json({ success: false, message: error.message });
}

export default router;