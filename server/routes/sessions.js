import express from "express";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import { publishSessionEvent } from "../services/sessionPubSub.js";
import DemoConsumption from "../models/DemoConsumption.js";
import AllPost from "../models/Allposts.js";
import GameSession from "../models/GameSession.js";
import {
  assignOrStartInstance,
  releaseInstance,
} from "../services/instanceAllocator.js";
import verifyToken from "../middlewares/authMiddleware.js";
import cacheService from "../services/cacheService.js";
import { SessionMetrics } from "../services/sessionMetrics.js";
import { sessionStreams } from "../services/sessionStream.js";
import { callController } from "../services/controllerService.js";
import PostAnalytics from "../models/postAnalytics.js";
import { processBilling } from "../services/creditBilling.js";

const router = express.Router();
const metrics = new SessionMetrics();

const CONFIG = {
  DEFAULT_DURATION: 600,      // 10 min
  FREE_GAME_DURATION: 600,    // 10 min
  PAID_GAME_DURATION: 600,    // 10 min
  MAX_CONCURRENT_SESSIONS: 3,
  INSTANCE_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 2,
};

const DEMO_CONFIG = {
  MIN_ACTIVE_SECONDS: 180,   // consume demo after 180s of healthy play
  HEARTBEAT_GRACE_SECONDS: 25, // allow short disconnect gaps
};


/**
 * POST /api/sessions/start
 * ✅ FIXED: Queue ONLY when ASG at max
 *           Skip queue when ASG is scaling
 */
router.post(
  "/start",
  verifyToken,
  [body("gamePostId").isMongoId().withMessage("Invalid gamePostId format")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const userId = req.user.id;
      const { gamePostId } = req.body;

      

      const alreadyUsed = await DemoConsumption.findOne({
        user: userId,
        gamePost: gamePostId,
        status: "consumed",
      }).lean();

      if (alreadyUsed) {
        return res.status(403).json({
          error: "Demo already consumed for this game",
        });
      }

      // ✅ Check concurrent session limit
      const activeSessions = await GameSession.countDocuments({
        user: userId,
        status: { $in: ["waiting", "allocation_ready", "starting", "running"] },
      });

      if (activeSessions >= 1) {
        return res.status(429).json({
          error: "Maximum concurrent sessions reached",
          active: activeSessions,
        });
      }

      // ✅ Get game post
      let post = await cacheService.getGamePost(gamePostId);

      if (!post) {
        post = await AllPost.findById(gamePostId)
          .select("type gamePost")
          .lean();

        if (!post || post.type !== "game_post" || !post.gamePost) {
          return res.status(404).json({ error: "Game not found" });
        }

        if (!post.gamePost.file?.url || !post.gamePost.startPath) {
          return res.status(400).json({
            error: "Game configuration incomplete",
          });
        }

        await cacheService.setGamePost(gamePostId, post);
      }

      const game = post.gamePost;

      if (
        game.creditBudget?.status !== "active" ||
        (game.creditBudget?.remainingCredits ?? 0) <= 0
      ) {
        return res.status(403).json({
          error: "Credits exhausted",
        });
      }
      
      const maxDurationSeconds = calculateSessionDuration(game);

      let queueType = "direct";
      let response202 = {
        status: "waiting",
      };

      let assignedInstance = null;

      try {
        const leaseResult = await assignOrStartInstance({});
        
        if (leaseResult?.status === "ASSIGNED") {
          assignedInstance = leaseResult;
          response202.status = "starting";
          response202.phase = "downloading";
        }

        if (leaseResult && leaseResult.queued) {
          console.log(`[Session Start] User will be queued:`, {
            position: leaseResult.queuePosition,
            total: leaseResult.totalQueued,
            wait: leaseResult.estimatedWaitMinutes
          });
          queueType = "queued";
          
          response202.queuePosition = leaseResult.queuePosition;
          response202.totalQueued = leaseResult.totalQueued;
          response202.estimatedWaitMinutes = leaseResult.estimatedWaitMinutes;
          response202.avgSessionDuration = leaseResult.avgSessionDuration
        } else if (leaseResult && leaseResult.scaling) {
          console.log(`[Session Start] ASG scaling - user skips queue, goes to ads`);
        }
      } catch (err) {
        console.error("[Session Start] Allocation check error (non-fatal):", err.message);
      }

      // ✅ Create session in WAITING state
      const session = await GameSession.create({
        user: userId,
        gamePost: gamePostId,
        status: assignedInstance ? "starting" : "waiting",
        phase: assignedInstance ? "downloading" : null,
        maxDurationSeconds,
        queueType,
        metadata: {
          gameVersion: game.version,
          platform: game.platform,
          gpuRequired: game.systemRequirements?.gpuRequired || false,
        },
      });
      response202.sessionId = session._id;

      if (assignedInstance) {
      const updatedSession = await GameSession.findByIdAndUpdate(
  session._id,
  {
    instanceId: assignedInstance.workerId,
    instanceIp: assignedInstance.instanceIp,
    leaseToken: assignedInstance.leaseToken,
    leaseExpiresAt: new Date(assignedInstance.leaseExpiresAt * 1000)
  },
  { new: true }
);

await callController(updatedSession, {
  id: assignedInstance.workerId,
  ip: assignedInstance.instanceIp,
  leaseToken: assignedInstance.leaseToken
});
    }

      const send = sessionStreams.get(session._id.toString());
      if (send) {
        send({
          status: assignedInstance ? "starting" : "waiting",
          phase: assignedInstance ? "downloading" : null
        });
      }

      console.log(`[Session Start] Returning 202`, response202);

      res.status(202).json(response202);
    } catch (err) {
      console.error("Session start error:", err);
      metrics.recordFailure("unknown", req.user?.id);
      return res.status(500).json({
        error: "Internal server error",
        message: "An unexpected error occurred",
      });
    }
  }
);
 
/**
 * GET /api/sessions/status/:sessionId
 * ✅ Returns current session status including queue info
 */
router.get("/:sessionId/status", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
 
    const session = await GameSession.findById(sessionId)
      .select(
        "user status phase countdownStartsAt countdownSeconds startedAt expiresAt maxDurationSeconds"
      )
      .lean();
 
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
 
    if (session.user.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }
 
    const now = Date.now();
    const remainingSeconds = session.expiresAt
      ? Math.max(0, Math.floor((new Date(session.expiresAt) - now) / 1000))
      : session.maxDurationSeconds;
 
    return res.json({
      sessionId,
      status: session.status,
      phase: session.phase,
      countdownStartsAt: session.countdownStartsAt,
      countdownSeconds: session.countdownSeconds,
      remainingSeconds,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error("Session status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
 
/**
 * GET /api/sessions/:sessionId/events
 * ✅ SSE stream for real-time updates
 */
router.get("/:sessionId/events", verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  console.log(`[SSE (Session)] User ${userId} requested events for session ${sessionId}`);
 
  const session = await GameSession.findById(sessionId)
    .select("user status phase countdownStartsAt")
    .lean();
 
  if (!session || session.user.toString() !== userId) {
    return res.sendStatus(403);
  }
 
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

 
  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
 
 const sendCurrentState = async () => {
  const fresh = await GameSession.findById(sessionId).lean();

  if (!fresh) return;

  let queueData = {};

  if (
    fresh.status === "waiting" &&
    fresh.queueType === "queued"
  ) {
    queueData = await getQueueData(fresh);
  }

  send({
    status: fresh.status,
    phase: fresh.phase,
    countdownStartsAt: fresh.countdownStartsAt,
    ...queueData,
  });
};

await sendCurrentState();

const interval = setInterval(async () => {
  try {
    await sendCurrentState();
  } catch (err) {
    console.error("Queue SSE update error:", err);
  }
}, 5000);
 
  sessionStreams.set(sessionId.toString(), send);
 
  req.on("close", () => {
    clearInterval(interval);
    sessionStreams.delete(sessionId.toString());
  });
});

/**
 * GET /api/sessions/:sessionId/stream-token
 * ✅ Get secure stream URL (only for running sessions)
 */
router.get("/:sessionId/stream-token", verifyToken, async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  const session = await GameSession.findById(sessionId).lean();
  if (!session) return res.sendStatus(404);
  if (session.user.toString() !== userId) return res.sendStatus(403);
  if (session.status !== "running") {
    return res.status(400).json({ error: "Session not ready" });
  }

  const streamToken = await cacheService.get(`streamtoken:${sessionId}`);
  if (!streamToken) {
    return res.status(400).json({ error: "Stream token not available yet" });
  }

  res.json({
    streamUrl: `https://${streamToken}.stream.rigzer.com`,
  });
});

/**
 * POST /api/sessions/:sessionId/heartbeat
 * ✅ Frontend sends every 10s to prove user is alive
 */
router.post("/:sessionId/heartbeat", verifyToken, async (req, res) => {
  try {
    await GameSession.findOneAndUpdate(
      { _id: req.params.sessionId, user: req.user.id },
      { lastHeartbeat: new Date() }
    );
    res.sendStatus(200);
  } catch (err) {
    console.error("Heartbeat error:", err);
    res.sendStatus(500);
  }
});

router.post("/heartbeat-by-token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    console.log("Heartbeat from stream", token);

    const cached = await cacheService.get(`stream:${token}`);
    if (!cached) {
      return res.sendStatus(404);
    }

    const session = await GameSession.findById(cached.sessionId);
    if (!session) {
      return res.sendStatus(404);
    }

    const now = new Date();

    await GameSession.findByIdAndUpdate(session._id, {
      lastHeartbeat: now,
      $unset: { disconnectDeadline: "" },
    });

    const billingResult =
      await processBilling(
        session._id
      );

    await startOrTouchDemoConsumption(session, now);

    if (billingResult?.exhausted) {

      await GameSession.findByIdAndUpdate(
        session._id,
        {
          status: "ended",
          endedAt: new Date(),
          exitReason:
            "credits_exhausted",
        }
      );

      if (
        session.instanceId &&
        session.leaseToken
      ) {
        await releaseInstance(
          session.instanceId,
          session.leaseToken
        );
      }

      const playTimeMs =
        Date.now() -
        new Date(session.startedAt).getTime();

      await recordSessionAnalytics(
        session.gamePost,
        session._id,
        playTimeMs,
        session.user.toString()
      );

      await finalizeDemoConsumption(
        session,
        "credits_exhausted",
        Math.floor(playTimeMs / 1000)
      );

      return res.status(410).json({
        error: "credits_exhausted",
      });
    }


    res.sendStatus(200);
  } catch (err) {
    console.error("Heartbeat by token error:", err);
    res.sendStatus(500);
  }
});

/**
 * POST /api/sessions/:sessionId/cancel
 * ✅ User cancels before launch (queued or countdown)
 */
router.post("/:sessionId/cancel", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
 
    const session = await GameSession.findById(sessionId);

      console.log(`[Session Cancel] User requested cancel for session ${sessionId}`);
 
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
 
    if (session.user.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // ✅ Release instance if allocated
    if (session.instanceId && session.leaseToken) {
      try {
        const releaseResult = await releaseInstance(
          session.instanceId,
          session.leaseToken
        );
        console.log("[Cancel] Release result:", releaseResult);
      } catch (err) {
        console.error("[Cancel] Error releasing instance:", err.message);
      }
    }
 
    // ✅ Mark as ended
    const reason =
      session.status === "allocation_ready"
        ? "user_cancelled"
        : "user_abandoned";

    console.log(`[Session Cancel] User cancelled session ${sessionId} with reason ${reason}`);
 
    const updates = {
      status: "ended",
      endedAt: new Date(),
      exitReason: reason,
    };
 
    await GameSession.findByIdAndUpdate(sessionId, updates);
 
    const send = sessionStreams.get(sessionId.toString());
    if (send) send({ status: "ended", reason });
 
    return res.json({ message: "Session cancelled", sessionId });
  } catch (err) {
    console.error("Session cancel error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/sessions/:sessionId/abandon/:secret
 * ✅ Beacon endpoint - user closed tab
 */
router.post("/:sessionId/abandon/:secret", async (req, res) => {
  if (req.params.secret !== process.env.ABANDON_SECRET) {
    return res.sendStatus(401);
  }

  const { sessionId } = req.params;

  try {
    const session = await GameSession.findById(sessionId);

    if (!session || session.status === "ended") {
      return res.sendStatus(200);
    }

    console.log(`[Abandon] Marking session ${sessionId} as disconnecting`);

    await GameSession.findByIdAndUpdate(sessionId, {
      disconnectDeadline: new Date(Date.now() + 60000), // 60 sec
      exitReason: "disconnect_pending"
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("Abandon error:", err);
    return res.sendStatus(500);
  }
});
/**
 * POST /api/sessions/running
 * ✅ Called by instance when stream starts (for metrics)
 */
router.post("/running", async (req, res) => {
  const { session_id } = req.body;
  console.log("[Running] Payload:", req.body);

  if (!session_id) {
    return res.status(400).json({ error: "session_id required" });
  }

  try {
    const session = await GameSession.findById(session_id);

    if (!session) {
      console.warn(`[Running] Session not found: ${session_id}`);
      return res.status(404).json({ error: "Session not found" });
    }

    // If already running avoid duplicate updates
    if (session.status !== "running") {
      const now = new Date();

      await GameSession.findByIdAndUpdate(
        session_id,
        {
          status: "running",
          phase: null,
          startedAt: now,

          "billing.lastBillingAt": now,
        }
      );

      await AllPost.updateOne(
          {
            _id: session.gamePost,
          },
          {
            $inc: {
              "gamePost.gameMetrics.totalSessions": 1,
              "gamePost.gameMetrics.uniquePlayers": 1,
            },
          }
        );
      console.log(`[Running] Session ${session_id} is now streaming`);

      // Notify SSE clients
      const send = sessionStreams.get(session_id.toString());
      if (send) {
        send({
          status: "running",
          phase: null
        });
      }

      // Optional: publish event for pubsub
      try {
        await publishSessionEvent(session_id, {
          status: "running",
          phase: null,
        });
      } catch (err) {
        console.warn("[Running] PubSub publish failed:", err.message);
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("[Running] Error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/sessions/complete
 * ✅ Called when session ends (by supervisor/controller)
 * ✨ NEW: Automatically prepare instance for next stream via controller
 */
router.post("/complete", async (req, res) => {
  try {
    const {
      session_id,
      exit_reason,
      exit_code,
      duration_seconds,
    } = req.body;

    console.log("[Session Complete] Payload:", req.body);

    const session = await GameSession.findById(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(`[Session Complete] Completing session ${session_id} with reason ${exit_reason} and duration ${duration_seconds}s`);

    if (session.status !== "ended") {
      const playTimeMs = (Number(duration_seconds) || 0) * 1000;
      console.log(`[Session Complete] Ending session ${session_id} with reason ${exit_reason}`);
      
      const updates = {
        status: "ended",
        endedAt: new Date(),
        exitReason: exit_reason || "user_exit",
        exitCode: exit_code,
      };

      await GameSession.findByIdAndUpdate(session_id, updates);

      await recordSessionAnalytics(
        session.gamePost,
        session_id,
        playTimeMs,
        session.user.toString()
      );

      await finalizeDemoConsumption(
        session,
        exit_reason || "user_exit",
        duration_seconds
      );

            // Release instance
      if (session.instanceId && session.leaseToken) {
        try {
          await releaseInstance(session.instanceId, session.leaseToken);
        } catch (err) {
          console.error("Error releasing instance:", err);
        }
      }
      const token = await cacheService.get(`streamtoken:${session_id}`);
      if (token) {
        await cacheService.del(`stream:${token}`);
      }
      await cacheService.del(`streamtoken:${session_id}`);

      // Notify SSE
      const send = sessionStreams.get(session_id.toString());
      if (send) send({ status: "ended", reason: exit_reason });

      // ✨ NEW: Trigger controller to prepare for next stream (web server restart)
      if (session.instanceIp) {
        console.log(`[Session Complete] Preparing instance ${session.instanceIp} for next stream`);
        try {
          const prepareResponse = await fetch(
            `http://${session.instanceIp}:4443/prepare-for-next-stream`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id, force_restart: false }),
              timeout: 30000,
            }
          );
          const result = await prepareResponse.json();
          console.log(`[Session Complete] Prepare result:`, result);
        } catch (err) {
          console.error(`[Session Complete] Prepare failed (non-blocking):`, err.message);
        }
      }


      metrics.recordSessionEnd(session.user.toString(), session_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Session complete error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


/**
 * POST /api/sessions/violation
 * ✅ Called by supervisor when a rule violation occurs
 * (focus loss, unauthorized process, integrity failure, etc.)
 */
router.post("/violation", async (req, res) => {
  try {
    const {
      session_id,
      violation,
      exit_code,
      duration_seconds
    } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id required" });
    }

    const session = await GameSession.findById(session_id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(
      `[Session Violation] Session ${session_id} violation: ${violation}`
    );

    const updates = {
      status: "ended",
      endedAt: new Date(),
      exitReason: violation || "violation",
      exitCode: exit_code
    };

    const playTimeMs = (Number(duration_seconds) || 0) * 1000;
    
    await GameSession.findByIdAndUpdate(session_id, updates);

    await recordSessionAnalytics(
      session.gamePost,
      session_id,
      playTimeMs,
      session.user.toString()
    );

    await finalizeDemoConsumption(
      session,
      violation || "violation",
      duration_seconds
    );

    // Release instance
    if (session.instanceId && session.leaseToken) {
      try {
        await releaseInstance(session.instanceId, session.leaseToken);
      } catch (err) {
        console.error("Violation release error:", err);
      }
    }

    // Remove stream token
    const token = await cacheService.get(`streamtoken:${session_id}`);
    if (token) {
      await cacheService.del(`stream:${token}`);
    }
    await cacheService.del(`streamtoken:${session_id}`);

    // Notify SSE clients
    const send = sessionStreams.get(session_id.toString());
    if (send) {
      send({
        status: "ended",
        reason: violation
      });
    }

    await publishSessionEvent(session_id, {
      status: "ended",
      phase: null,
      reason: violation
    });

    console.log(`[Session Violation] Session ${session_id} terminated`);

    return res.json({ success: true });

  } catch (err) {
    console.error("[Session Violation] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ================= HELPERS ================= */


async function getQueueData(session) {
  if (session.queueType !== "queued") {
    return { queuePosition: null, totalQueued: null, estimatedWaitMinutes: null };
  }
 
  const queuePosition =
    (await GameSession.countDocuments({
      status: "waiting",
      queueType: "queued",
      createdAt: { $lt: session.createdAt },
    })) + 1;
 
  const totalQueued = await GameSession.countDocuments({
    status: "waiting",
    queueType: "queued",
  });
 
  return {
    queuePosition,
    totalQueued,
    estimatedWaitMinutes:
      Math.ceil(
        queuePosition *
        avgSessionDuration
      ),
  };
}


async function recordSessionAnalytics(gamePostId, sessionId, playTimeMs, userId) {
  const postIdStr = gamePostId.toString();
  const dateKey = new Date().toISOString().split("T")[0];
 
  // ── 1. Write totalPlayTime into the GameSession itself ───────────────────
  //
  // FIX: This was never done anywhere. metrics.totalPlayTime stayed 0
  // because nothing wrote to it when the session ended.
  //
  await GameSession.findByIdAndUpdate(sessionId, {
    $set: { "metrics.totalPlayTime": playTimeMs },
  });
 
  await PostAnalytics.findOneAndUpdate(
    { post: gamePostId },
    {
      $inc: {
        "lifetime.sessions": 1,
        "lifetime.sessionPlayTimeMs": playTimeMs,
        "lifetime.uniquePlayers": 1,
      },
    },
    { upsert: true }
  );
 
  // ── 4. Update dailyStats ──────────────────────────────────────────────────
  const dailyResult = await PostAnalytics.updateOne(
    { post: gamePostId, "dailyStats.date": dateKey },
    {
      $inc: {
        "dailyStats.$.sessions": 1,
        "dailyStats.$.sessionPlayTimeMs": playTimeMs,
        "dailyStats.$.uniquePlayers": 1,
      },
    }
  );
 
  if (dailyResult.matchedCount === 0) {
    await PostAnalytics.updateOne(
      { post: gamePostId, "dailyStats.date": { $ne: dateKey } },
      {
        $push: {
          dailyStats: {
            date: dateKey,
            views: 0,
            uniqueViews: 0,
            watchTimeMs: 0,
            likes: 0,
            comments: 0,
            demoConsumptions: 0,
            sessions: 1,
            sessionPlayTimeMs: playTimeMs,
            uniquePlayers: 1,
          },
        },
      }
    );
  }
}
 
/**
 * Called when a DemoConsumption is marked "consumed".
 *
 * FIX: The original `finalizeDemoConsumption` referenced `gamePostId` and
 * `dateKey` which were never defined in that scope, causing a ReferenceError
 * that was silently swallowed — meaning demoConsumptions was never written.
 *
 * @param {string|ObjectId} gamePostId
 */
async function recordDemoConsumptionAnalytics(gamePostId) {
  const dateKey = new Date().toISOString().split("T")[0];
 
  // lifetime increment
  await PostAnalytics.findOneAndUpdate(
    { post: gamePostId },
    { $inc: { "lifetime.demoConsumptions": 1 } },
    { upsert: true }
  );
 
  // dailyStats increment
  const dailyResult = await PostAnalytics.updateOne(
    { post: gamePostId, "dailyStats.date": dateKey },
    { $inc: { "dailyStats.$.demoConsumptions": 1 } }
  );
 
  if (dailyResult.matchedCount === 0) {
    await PostAnalytics.updateOne(
      { post: gamePostId, "dailyStats.date": { $ne: dateKey } },
      {
        $push: {
          dailyStats: {
            date: dateKey,
            views: 0,
            uniqueViews: 0,
            watchTimeMs: 0,
            likes: 0,
            comments: 0,
            demoConsumptions: 1,
            sessions: 0,
            sessionPlayTimeMs: 0,
            uniquePlayers: 0,
          },
        },
      }
    );
  }
}
 
// ─── DEMO CONSUMPTION LOGIC ──────────────────────────────────────────────────
 
async function startOrTouchDemoConsumption(session, now = new Date()) {
  const existing = await DemoConsumption.findOne({
    user: session.user,
    gamePost: session.gamePost,
  });
 
  if (existing?.status === "consumed") return existing;
 
  if (!existing) {
    return DemoConsumption.create({
      user: session.user,
      gamePost: session.gamePost,
      gameSession: session._id,
      status: "active",
      startedAt: now,
      firstHeartbeatAt: now,
      lastHeartbeatAt: now,
      connectedSeconds: 0,
      graceSecondsUsed: 0,
      metadata: {
        hostId: session.instanceId || null,
        appId: session.gamePost?.toString?.() || null,
        instanceId: session.instanceId || null,
        region: session.instanceRegion || null,
      },
    });
  }
 
  if (existing.status === "active") {
    const last = existing.lastHeartbeatAt || existing.firstHeartbeatAt || existing.startedAt;
    const deltaSeconds = Math.max(0, Math.floor((now - last) / 1000));
 
    if (deltaSeconds <= DEMO_CONFIG.HEARTBEAT_GRACE_SECONDS) {
      existing.connectedSeconds += deltaSeconds;
      existing.lastHeartbeatAt = now;
      if (!existing.firstHeartbeatAt) existing.firstHeartbeatAt = now;
      if (!existing.gameSession) existing.gameSession = session._id;
      await existing.save();
    } else {
      existing.graceSecondsUsed += deltaSeconds;
      existing.lastHeartbeatAt = now;
      await existing.save();
    }
  }
 
  return existing;
}
 
async function finalizeDemoConsumption(session, reason = "user_exit", exitSeconds = null) {
  const demo = await DemoConsumption.findOne({
    user: session.user,
    gamePost: session.gamePost,
  });
 
  if (!demo) return;
 
  const now = new Date();
  const totalSeconds = Math.max(demo.connectedSeconds || 0, exitSeconds || 0);
  const shouldConsume = totalSeconds >= DEMO_CONFIG.MIN_ACTIVE_SECONDS;
 
  demo.endedAt = now;
  demo.connectedSeconds = totalSeconds;
 
  if (shouldConsume) {
    demo.status = "consumed";
    demo.consumedAt = now;
    demo.consumedReason = "min_playtime_reached";
 
    // FIX: Write analytics — was broken before due to undefined variables
    await recordDemoConsumptionAnalytics(session.gamePost);
  } else {
    demo.status = reason === "user_cancelled" ? "cancelled" : "expired";
    demo.consumedReason = "user_exit_before_threshold";
  }
 
  await demo.save();
}

function calculateSessionDuration(game) {
  if (game.price === 0) return CONFIG.FREE_GAME_DURATION;
  if (game.price > 0) return CONFIG.PAID_GAME_DURATION;
  return CONFIG.DEFAULT_DURATION;
}

function determineCleanupPolicy(game) {
  const isLargeGame = game.file?.size > 1024 * 1024 * 1024;
  return {
    on_normal_exit: true,
    on_violation: true,
    on_timeout: true,
    delete_game_files: isLargeGame,
    shared_build: false,
  };
}

export default router;