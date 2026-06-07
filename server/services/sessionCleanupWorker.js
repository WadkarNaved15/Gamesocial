/**
 * Game Session Cleanup Worker
 * 
 * This should run as a SEPARATE process (e.g., via cron, systemd timer, or Kubernetes job).
 * DO NOT run this inside your main API servers.
 * 
 * It uses a distributed lock in Redis to ensure only ONE instance cleans at a time.
 * Uses the same Redis configuration as your main server.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import redisClient from "../config/redis.js";
import fetch from "node-fetch";
import GameSession from "../models/GameSession.js";
import { releaseInstance } from "./instanceAllocator.js";
import { finalizeSession } from "../helper/session.js"; 

dotenv.config();

const LOCK_KEY = "cleanup:lock";
const LOCK_TTL = 30; // seconds
const CLEANUP_INTERVAL = 60_000; // 60 seconds

/**
 * Attempt to acquire a distributed lock in Redis
 * Returns lock ID if successful, null if lock is held by another process
 */
async function acquireLock() {
  try {
    const lockId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const acquired = await redisClient.set(
      LOCK_KEY,
      lockId,
      { NX: true, EX: LOCK_TTL }
    );
    return acquired ? lockId : null;
  } catch (err) {
    console.error("❌ Error acquiring lock:", err);
    return null;
  }
}

/**
 * Release the distributed lock
 */
async function releaseLock(lockId) {
  try {
    const current = await redisClient.get(LOCK_KEY);
    if (current === lockId) {
      await redisClient.del(LOCK_KEY);
      console.log(`✅ Lock released: ${lockId}`);
    }
  } catch (err) {
    console.error("❌ Error releasing lock:", err);
  }
}

/**
 * Clean up stale game sessions
 */
async function cleanupStaleSessions(lockId) {
  try {
    console.log(`\n[Cleanup ${lockId.substring(0, 8)}...] Starting cleanup cycle...`);

    const staleThreshold = new Date(Date.now() - 90_000); // 90 seconds ago

    const staleSessions = await GameSession.find({
      status: { $in: ["waiting", "starting", "running"] },
      lastHeartbeat: { $lt: staleThreshold },
    });

    if (staleSessions.length === 0) {
      console.log(`[Cleanup ${lockId.substring(0, 8)}...] ✓ No stale sessions found`);
      return;
    }

    console.log(`[Cleanup ${lockId.substring(0, 8)}...] Found ${staleSessions.length} stale session(s)`);

    let cleanedCount = 0;
    let errorCount = 0;

    for (const session of staleSessions) {
      try {
        console.log(`[Cleanup] Processing session: ${session._id}`);

        // Stop the game instance if it exists
        if (session.instanceIp) {
          try {
            await fetch(`http://${session.instanceIp}:4443/stop-session`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: session._id.toString() }),
              timeout: 5000,
            });
            console.log(`[Cleanup] ✓ Stopped instance: ${session.instanceIp}`);
          } catch (err) {
            console.warn(`[Cleanup] ⚠ Failed to stop instance for session ${session._id}:`, err.message);
          }
        }


        await finalizeSession(session, "stale_abandoned");

        // Release the instance lease
        if (session.instanceId && session.leaseToken) {
          try {
            await releaseInstance(session.instanceId, session.leaseToken);
            console.log(`[Cleanup] ✓ Released instance: ${session.instanceId}`);
          } catch (err) {
            console.warn(`[Cleanup] ⚠ Failed to release instance ${session.instanceId}:`, err.message);
          }
        }

        console.log(`[Cleanup] ✅ Session ${session._id} cleaned up`);
        cleanedCount++;
      } catch (err) {
        console.error(`[Cleanup] ❌ Error cleaning session ${session._id}:`, err.message);
        errorCount++;
      }
    }

    console.log(`[Cleanup ${lockId.substring(0, 8)}...] Cleanup complete: ${cleanedCount} cleaned, ${errorCount} errors`);
  } catch (err) {
    console.error(`[Cleanup] Fatal error during cleanup:`, err);
  }
}

/**
 * Main loop - runs cleanup at intervals with distributed lock
 */
async function startCleanupWorker() {
  try {
    console.log("🚀 Cleanup worker started\n");

    const cleanupInterval = setInterval(async () => {
      const lockId = await acquireLock();
      if (!lockId) return;

      try {
        await cleanupStaleSessions(lockId);
      } finally {
        await releaseLock(lockId);
      }
    }, CLEANUP_INTERVAL);

    process.on("SIGTERM", async () => {
      clearInterval(cleanupInterval);
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      clearInterval(cleanupInterval);
      process.exit(0);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
}

export default startCleanupWorker;