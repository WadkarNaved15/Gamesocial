// services/capacityReconciler.js

import crypto from "crypto";
import redis from "../config/redis.js";
import GameSession from "../models/GameSession.js";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const LEASE_LAMBDA_NAME =
  process.env.LEASE_LAMBDA_NAME || "leaseGpuWorker";

const LOCK_TTL = 60000; // 10 sec

const ACTIVE_SESSION_STATUSES = [
    "waiting",
    "allocation_ready",
    "starting",
    "running"
];

function getLambda(region) {
  return new LambdaClient({
    region,
  });
}

function lockKey(region) {
  return `capacity:lock:${region}`;
}

function dirtyKey(region) {
  return `capacity:dirty:${region}`;
}

async function acquireLock(region, token) {
  return await redis.set(
    lockKey(region),
    token,
    {
      NX: true,
      PX: LOCK_TTL,
    }
  );
}

async function releaseLock(region, token) {
  const current = await redis.get(lockKey(region));

  if (current === token) {
    await redis.del(lockKey(region));
  }
}

async function markDirty(region) {
  return await redis.incr(dirtyKey(region));
}

async function clearDirty(region) {
  await redis.del(dirtyKey(region));
}

async function isDirty(region) {
  return !!(await redis.get(dirtyKey(region)));
}

async function calculateDemand(region) {

    const sessions = await GameSession.find({
        instanceRegion: region
    })
    .select("status instanceRegion")
    .lean();

    console.log("Sessions in region:", sessions);

    return GameSession.countDocuments({
        instanceRegion: region,
        status: {
            $in: ACTIVE_SESSION_STATUSES
        }
    });
}


async function invokeLambda(
  region,
  requiredCapacity
) {
  const lambda =
    getLambda(region);

  await lambda.send(
    new InvokeCommand({
      FunctionName:
        LEASE_LAMBDA_NAME,

      InvocationType:
        "Event",

      Payload: Buffer.from(
        JSON.stringify({
          action: "RECONCILE",
          preferredRegion: region,
          requiredCapacity,
        })
      ),
    })
  );
}

export async function reconcileCapacity(region) {
  if (!region) return;

  await markDirty(region);

  const token =
    crypto.randomUUID();

  const acquired =
    await acquireLock(region, token);

  if (!acquired) {
    return;
  }

  try {

    while (true) {

    const beforeVersion =
        await redis.get(dirtyKey(region));

    const demand =
        await calculateDemand(region);

    console.log("[Capacity] Demand:", demand);

    await invokeLambda(
        region,
        demand
    );

    const afterVersion =
        await redis.get(dirtyKey(region));

    if (beforeVersion === afterVersion) {
        break;
    }

    console.log(
        `[Capacity] ${region} demand changed while reconciling. Running again...`
    );
}
  } catch (err) {

    console.error(
      `[Capacity] ${region}`,
      err
    );

  } finally {

    await releaseLock(
      region,
      token
    );

  }
}