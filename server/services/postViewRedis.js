import redis from "../config/redis.js";

const UNIQUE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const COOLDOWN_TTL_SECONDS = 60 * 5; // 5 minutes

export const markViewInRedis = async ({ postId, viewerId }) => {
  const uniqueKey = `post:view:unique:${postId}:user:${viewerId}`;
  const cooldownKey = `post:view:cooldown:${postId}:user:${viewerId}`;

  const [cooldownSet, uniqueSet] = await Promise.all([
    redis.set(cooldownKey, "1", { NX: true, EX: COOLDOWN_TTL_SECONDS }),
    redis.set(uniqueKey, "1", { NX: true, EX: UNIQUE_TTL_SECONDS }),
  ]);

  return {
    countedThisTime: Boolean(cooldownSet),
    isUnique: Boolean(uniqueSet),
  };
};