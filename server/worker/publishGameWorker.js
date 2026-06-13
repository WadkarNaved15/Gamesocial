// workers/publishGameWorker.js

import { Worker } from "bullmq";
import { redisConfig } from "../config/redis.js";

import {
  runPublishJob,
} from "../routes/gamePosts.js";

const worker = new Worker(
  "publish-game",
  async (job) => {

    await runPublishJob(
      job.data.draftId,
      job.data.creditPurchaseId
    );

  },
  {
    connection: redisConfig,
    concurrency: 5,
    stalledInterval: 30000,
  }
);


worker.on("completed", job => {
  console.log(
    `Job ${job.id} completed`
  );
});

worker.on("failed", (job, err) => {
  console.error(
    `Job ${job?.id} failed`,
    err
  );
});