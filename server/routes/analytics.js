// routes/analytics.js

import express from "express";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";

import verifyToken from "../middlewares/authMiddleware.js";
import {
  getGeoData,
  getASNData,
} from "../services/geoService.js";
import redisClient from "../config/redis.js";

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
    const userId = req.user.id;
    const lockKey = `session:start:${userId}`;

    let lockAcquired = false;

    try {
      lockAcquired = await redisClient.set(
        lockKey,
        "1",
        {
          NX: true,
          EX: 10,
        }
      );

      if (!lockAcquired) {
        return res.status(429).json({
          success: false,
          message:
            "Session creation already in progress",
        });
      }

      const {
        existingSessionId,
        source = "web",
      } = req.body;

      const now = new Date();

      const ip =
        req.headers["x-forwarded-for"]
          ?.split(",")[0]
          ?.trim() ||
        req.socket.remoteAddress ||
        null;

      const geoData = ip
        ? getGeoData(ip)
        : null;

      const asnData = ip
        ? getASNData(ip)
        : null;

      const ua = new UAParser(
        req.headers["user-agent"]
      ).getResult();

      const language =
        req.headers["accept-language"]
          ?.split(",")[0]
          ?.trim() || null;

      const languages =
        req.headers["accept-language"]
          ?.split(",")
          .map((x) => x.trim()) || [];

      // Existing session from localStorage
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

          if (
            inactiveMs <
            SESSION_TIMEOUT_MS
          ) {
            await UserSession.updateOne(
              { _id: existingSession._id },
              {
                $set: {
                  lastActivityAt: now,
                  lastHeartbeatAt: now,
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

          await UserSession.updateOne(
            { _id: existingSession._id },
            {
              $set: {
                endedAt: now,
                durationMs:
                  (
                    existingSession.lastHeartbeatAt ??
                    existingSession.lastActivityAt
                  ).getTime() -
                  existingSession.startedAt.getTime(),

                isBounce:
                  existingSession.pageViews <=
                    1 &&
                  existingSession.actions <=
                    1,
              },
            }
          );
        }
      }

      // IMPORTANT:
      // Check if user already has an active session
      const activeSession =
        await UserSession.findOne({
          user: userId,
          endedAt: null,
          lastActivityAt: {
            $gte: new Date(
              Date.now() -
                SESSION_TIMEOUT_MS
            ),
          },
        }).sort({
          startedAt: -1,
        });

      if (activeSession) {
        await UserSession.updateOne(
          {
            _id: activeSession._id,
          },
          {
            $set: {
              lastActivityAt: now,
              lastHeartbeatAt: now,
            },
          }
        );

        return res.json({
          success: true,
          sessionId:
            activeSession.sessionId,
          reused: true,
        });
      }

      const sessionId =
        crypto.randomUUID();

      await UserSession.create({
        sessionId,

        user: userId,

        source,

        startedAt: now,
        lastActivityAt: now,
        lastHeartbeatAt: now,

        geo: {
          countryCode:
            geoData?.country?.iso_code,

          country:
            geoData?.country?.names?.en,

          region:
            geoData?.subdivisions?.[0]
              ?.names?.en,

          city:
            geoData?.city?.names?.en,

          timezone:
            geoData?.location?.time_zone,

          latitude:
            geoData?.location?.latitude,

          longitude:
            geoData?.location?.longitude,

          postalCode:
            geoData?.postal?.code,

          detectedAt: now,

          isp: {
            asn:
              asnData?.autonomous_system_number,

            organization:
              asnData?.autonomous_system_organization,
          },
        },

        device: {
          deviceType:
            ua.device?.type ||
            "desktop",

          vendor:
            ua.device?.vendor,

          model:
            ua.device?.model,

          browser:
            ua.browser?.name,

          browserVersion:
            ua.browser?.version,

          operatingSystem:
            ua.os?.name,

          operatingSystemVersion:
            ua.os?.version,
        },

        locale: {
          language,
          languages,
        },
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

      return res.status(500).json({
        success: false,
        message:
          "Failed to create session",
      });
    } finally {
      if (lockAcquired) {
        await redisClient.del(lockKey);
      }
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

      if (session.endedAt) {
        return res.json({ success: true });
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

      
      if (!session) {
        return res.json({
          success: true,
        });
      }

      if (session.endedAt) {
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
  (
    session.lastHeartbeatAt ??
    session.lastActivityAt ??
    now
  ).getTime() -
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