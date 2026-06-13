// workers/draftCleanupWorker.js

import { Worker } from "bullmq";
import { redisConfig } from "../config/redis.js";
import { runDraftCleanup } from "./cleanupLogic.js";

export const draftCleanupWorker =
  new Worker(
    "draft-cleanup",
    async () => {
      await runDraftCleanup();
    },
    {
      connection: redisConfig,
      concurrency: 1,
    }
  );

draftCleanupWorker.on(
  "completed",
  () => {
    console.log(
      "✅ Draft cleanup completed"
    );
  }
);

draftCleanupWorker.on(
  "failed",
  (_, err) => {
    console.error(
      "❌ Draft cleanup failed",
      err
    );
  }
);