import redis from "../config/redis.js";

const COOLDOWN_TTL_SECONDS = 60 * 15; // 15 minutes

export const markViewInRedis = async ({ postId, viewerId }) => {
  const cooldownKey = `post:view:cooldown:${postId}:user:${viewerId}`;

  const cooldownSet = await redis.set(cooldownKey, "1", {
    NX: true,
    EX: COOLDOWN_TTL_SECONDS,
  });

  return {
    countedThisTime: Boolean(cooldownSet),
  };
};