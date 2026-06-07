import DemoConsumption from "../models/DemoConsumption.js";
import GameSession from "../models/GameSession.js";
import PostAnalytics from "../models/postAnalytics.js";
import CreditAudit from "../models/CreditAudit.js";
import AllPost from "../models/Allposts.js";



/* ================= HELPERS ================= */

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




export async function getQueueData(
  session
) {
  if (
    session.queueType !== "queued"
  ) {
    return {
      queuePosition: null,
      totalQueued: null,
      estimatedWaitMinutes: null,
    };
  }

  const queuePosition =
    (await GameSession.countDocuments({
      status: "waiting",
      queueType: "queued",
      createdAt: {
        $lt: session.createdAt,
      },
    })) + 1;

  const totalQueued =
    await GameSession.countDocuments({
      status: "waiting",
      queueType: "queued",
    });

  const avgSessionDuration =
    await getAverageSessionDurationMinutes();

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


export async function getAverageSessionDurationMinutes() {
  const result =
    await GameSession.aggregate([
      {
        $match: {
          status: "ended",
          "billing.billedPlayTimeMs": {
            $gt: 0,
          },
        },
      },
      {
        $group: {
          _id: null,
          avgPlayTimeMs: {
            $avg:
              "$billing.billedPlayTimeMs",
          },
        },
      },
    ]);

  const avgMs =
    result[0]?.avgPlayTimeMs || 0;

  if (!avgMs) {
  return 10;
}

return Math.ceil(avgMs / 60000);
}

export async function finalizeSession(
  session,
  exitReason
) {
    const lockSession =
  await GameSession.findOneAndUpdate(
    {
      _id: session._id,
      analyticsProcessed: {
        $ne: true,
      },
    },
    {
      $set: {
        analyticsProcessed: true,
      },
    },
    {
      new: true,
    }
  );

if (!lockSession) {
  return;
}
  const playTimeMs =
    session.billing?.billedPlayTimeMs || 0;

  const creditsConsumed =
    session.billing?.creditsConsumed || 0;

  await GameSession.updateOne(
    { _id: session._id },
    {
      $set: {
        status: "ended",
        endedAt: new Date(),
        exitReason,
        "metrics.totalPlayTime":
          playTimeMs,
      },
    }
  );

  if (
    playTimeMs > 0 ||
    creditsConsumed > 0
  ) {
    await recordSessionAnalytics(
      session.gamePost,
      session._id,
      playTimeMs,
      session.user.toString()
    );

    if (creditsConsumed > 0) {
      await createConsumptionAudit(
        session
      );
    }

    await finalizeDemoConsumption(
      session,
      exitReason,
      Math.ceil(playTimeMs / 1000)
    );
  }
}

export async function recordSessionAnalytics(gamePostId, sessionId, playTimeMs, userId) {

    await PostAnalytics.findOneAndUpdate(
  {
    post: gamePostId,
  },
  {
    $setOnInsert: {
      post: gamePostId,
      dailyStats: [],
      hourlyStats: [],
    },
  },
  {
    upsert: true,
  }
);
  const dateKey = new Date().toISOString().split("T")[0];
 
  // ── 1. Write totalPlayTime into the GameSession itself ───────────────────
  //
  // FIX: This was never done anywhere. metrics.totalPlayTime stayed 0
  // because nothing wrote to it when the session ended.
  //
  await GameSession.findByIdAndUpdate(sessionId, {
    $set: { "metrics.totalPlayTime": playTimeMs },
  });

  const hasPreviousSession =
  await GameSession.exists({
    gamePost: gamePostId,
    user: userId,
    _id: { $ne: sessionId },
  });
 
 
  // ── 4. Update dailyStats ──────────────────────────────────────────────────
const dailyResult = await PostAnalytics.updateOne(
  {
    post: gamePostId,
    "dailyStats.date": dateKey,
  },
  {
    $inc: {
      "dailyStats.$.sessions": 1,
      "dailyStats.$.sessionPlayTimeMs": playTimeMs,

      ...(hasPreviousSession
        ? {}
        : {
            "dailyStats.$.uniquePlayers": 1,
          }),
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
            uniquePlayers:
  hasPreviousSession ? 0 : 1,
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
export async function recordDemoConsumptionAnalytics(gamePostId) {
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
 
export async function startOrTouchDemoConsumption(session, now = new Date()) {
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
 
export async function finalizeDemoConsumption(session, reason = "user_exit", exitSeconds = null) {
  const demo = await DemoConsumption.findOne({
    user: session.user,
    gamePost: session.gamePost,
  });
 
  if (!demo) return;

  if (demo.status === "consumed") {
  return;
}
 
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

export async function createConsumptionAudit(session) {
  if (
    session.auditRecorded ||
    session.billing?.creditsConsumed <= 0
  ) {
    return;
  }

  const post = await AllPost.findById(
    session.gamePost
  ).select(
    "user gamePost.creditBudget.remainingCredits"
  );

  if (!post) return;

  await CreditAudit.create({
    gamePost: session.gamePost,
    creator: post.user,

    action: "consumption",

    credits: session.billing.creditsConsumed,

    previousBalance:
      post.gamePost.creditBudget.remainingCredits +
      session.billing.creditsConsumed,

    newBalance:
      post.gamePost.creditBudget.remainingCredits,

    reason: `Session ${session._id}`,

    metadata: {
      sessionId: session._id.toString(),
    },
  });

  await GameSession.updateOne(
    { _id: session._id },
    {
      $set: {
        auditRecorded: true,
      },
    }
  );
}

export function calculateSessionDuration(game) {
  if (game.price === 0) return CONFIG.FREE_GAME_DURATION;
  if (game.price > 0) return CONFIG.PAID_GAME_DURATION;
  return CONFIG.DEFAULT_DURATION;
}

export function determineCleanupPolicy(game) {
  const isLargeGame = game.file?.size > 1024 * 1024 * 1024;
  return {
    on_normal_exit: true,
    on_violation: true,
    on_timeout: true,
    delete_game_files: isLargeGame,
    shared_build: false,
  };
}