// services/analyticsService.js

import UserActivityEvent from "../models/UserActivityEvent.js";
import UserSession from "../models/UserSession.js";

async function touchSession(sessionId) {
  if (!sessionId) return;

await UserSession.updateOne(
  { sessionId },
  {
    $inc: {
      actions: 1,
    },

    $set: {
      lastActivityAt: new Date(),
    },
  }
);
}

export async function trackEvent({
  user,
  sessionId,
  eventType,
  targetType = null,
  targetId = null,
  metadata = {},
  source = "web",
}) {
  try {
    await Promise.all([
      UserActivityEvent.create({
        user,
        sessionId,
        eventType,
        targetType,
        targetId,
        metadata,
        source,
      }),

      touchSession(sessionId),
    ]);
  } catch (err) {
    console.error("Analytics Error:", err);
  }
}