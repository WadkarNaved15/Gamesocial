// queues/draftCleanupQueue.js

import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.js";

export const draftCleanupQueue =
  new Queue("draft-cleanup", {
    connection: redisConfig,
  });