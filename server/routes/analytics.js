// routes/analytics.js

import express from "express";
import crypto from "crypto";

import verifyToken from "../middlewares/authMiddleware.js";

import UserSession from "../models/UserSession.js";
import { trackEvent } from "../services/analyticsService.js";
import PostAnalytics from "../models/postAnalytics.js";

const router = express.Router();

const SESSION_TIMEOUT_MS = 45 * 60 * 1000; // 45 min

const ALLOWED_EVENTS = [
  "page_view",
  "content_view",
  "profile_page_view",

  "search",
  "search_click",

  "game_launch",

  "ad_click",

  "share",

  "wishlist_add",
  "wishlist_remove",

  "article_view"
];


const ACTION_EVENTS = [
  "search",
  "search_click",
  "share",
  "wishlist_add",
  "wishlist_remove",
  "game_launch",
  "ad_click",
];


router.post(
  "/session/start",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;

      const {
        existingSessionId,
        source = "web",

        deviceType = "unknown",
        browser = "unknown",
        operatingSystem = "unknown",
      } = req.body;

      const now = new Date();

      // Try to reuse existing session
      if (existingSessionId) {
        const existingSession =
          await UserSession.findOne({
            sessionId: existingSessionId,
            user: userId,
          });

        if (existingSession) {
          const inactiveMs =
            now.getTime() -
            existingSession.lastActivityAt.getTime();

          // Session still active
          if (
            inactiveMs <
            SESSION_TIMEOUT_MS
          ) {
            await UserSession.updateOne(
              {
                _id: existingSession._id,
              },
              {
                $set: {
                  lastActivityAt: now,
                  lastHeartbeatAt: now,
                  deviceType,
                  browser,
                  operatingSystem,
                },
              }
            );

            return res.json({
              success: true,
              sessionId:
                existingSession.sessionId,
              reused: true,
            });
          }

          // Mark old session ended
          await UserSession.updateOne(
            {
              _id: existingSession._id,
            },
            {
              $set: {
                endedAt: now,
                durationMs:
                  now.getTime() -
                  existingSession.startedAt.getTime(),
                isBounce:
                  existingSession.pageViews <= 1 &&
                  existingSession.actions <= 1
              },
            }
          );
        }
      }

      // Create fresh session
      const sessionId =
        crypto.randomUUID();

      await UserSession.create({
        sessionId,

        user: userId,

        source,

        deviceType,
        browser,
        operatingSystem,

        startedAt: now,

        lastActivityAt: now,
        lastHeartbeatAt: now,
      });

      return res.json({
        success: true,
        sessionId,
        reused: false,
      });
    } catch (err) {
      console.error(
        "[SESSION_START]",
        err
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to create session",
      });
    }
  }
);

router.post(
  "/event",
  verifyToken,
  async (req, res) => {
    try {
      const {
        eventType,
        targetType,
        targetId,
        metadata,
      } = req.body;

      if (
        !ALLOWED_EVENTS.includes(eventType)
        ) {
        return res.status(400).json({
            success: false,
        });
        }

            const sessionId =
        req.headers["x-session-id"];

        if (!sessionId) {
        return res.status(400).json({
            success: false,
            message: "Missing session id",
        });
        }
    
        if (ACTION_EVENTS.includes(eventType)) {
  await UserSession.updateOne(
    { sessionId },
    {
      $inc: {
        actions: 1,
      },
    }
  );
}


      await trackEvent({
        user: req.user.id,
        sessionId,
        eventType,
        targetType,
        targetId,
        metadata,

        source: "web",
      });

      if (eventType === "page_view") {
        await UserSession.updateOne(
          { sessionId },
          {
            $inc: {
              pageViews: 1,
            },
          }
        );
      }

      if (eventType === "share") {
        const today = new Date()
        .toISOString()
        .slice(0, 10);
        
        const result =
          await PostAnalytics.updateOne(
            {
              post: targetId,
              "dailyStats.date": today,
            },
            {
              $inc: {
                "lifetime.shares": 1,
                "dailyStats.$.shares": 1,
              },
            }
          );


          if (result.modifiedCount === 0) {
            await PostAnalytics.updateOne(
              { post: targetId },
              {
                $inc: {
                  "lifetime.shares": 1,
                },

                $push: {
                  dailyStats: {
                    date: today,

                    views: 0,
                    uniqueViews: 0,
                    watchTimeMs: 0,

                    likes: 0,
                    comments: 0,
                    shares: 1,

                    demoConsumptions: 0,

                    sessions: 0,
                    sessionPlayTimeMs: 0,

                    uniquePlayers: 0,
                  },
                },
              }
            );
          }
      }

      res.json({
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
      });
    }
  }
);


router.post(
  "/session/heartbeat",
  verifyToken,
  async (req, res) => {
    try {
      const sessionId =
        req.headers["x-session-id"];

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Missing session id",
        });
      }

      const session =
        await UserSession.findOne({
          sessionId,
        });

      if (!session) {
        return res.status(404).json({
          success: false,
        });
      }

      const now = new Date();

      const elapsed =
        now.getTime() -
        new Date(
          session.lastHeartbeatAt ??
          session.lastActivityAt
        ).getTime();

      await UserSession.updateOne(
        { _id: session._id },
        {
          $set: {
            lastActivityAt: now,
            lastHeartbeatAt: now,
          },

          $inc: {
            activeTimeMs: Math.max(
              0,
              Math.min(
                elapsed,
                2 * 60 * 1000
              )
            ),
          },
        }
      );

      res.json({
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
      });
    }
  }
);

router.post(
  "/session/end",
  verifyToken,
  async (req,res)=> {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Missing session id",
        });
      }

      const session =
        await UserSession.findOne({
          sessionId,
        });

        

        if (session.endedAt) {
  return res.json({
    success: true,
  });
}

      if (!session) {
        return res.json({
          success: true,
        });
      }

      const now = new Date();

      const elapsed =
  now.getTime() -
  new Date(
    session.lastHeartbeatAt ??
    session.lastActivityAt
  ).getTime();

      await UserSession.updateOne(
        { _id: session._id },
        {
         $set: {
  endedAt: now,
  durationMs:
    now.getTime() -
    session.startedAt.getTime(),

  isBounce:
    session.pageViews <= 1 &&
    session.actions <= 1,
},

$inc: {
  activeTimeMs: Math.max(
    0,
    Math.min(
      elapsed,
      2 * 60 * 1000
    )
  ),
},
        }
      );

      res.json({
        success: true,
      });
    } catch (err) {
      console.error(
        "[SESSION_END]",
        err
      );

      res.status(500).json({
        success: false,
      });
    }
  }
);

export default router;