// queues/publishGameQueue.js

import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.js";

export const publishGameQueue =
  new Queue("publish-game", {
    connection: redisConfig,
  });