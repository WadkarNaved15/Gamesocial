// jobs/registerRepeatJobs.js

import { draftCleanupQueue } from "../queues/draftCleanupQueue.js";

export async function registerRepeatJobs() {
  await draftCleanupQueue.upsertJobScheduler(
  "draft-cleanup-hourly",
  {
    every: 60 * 60 * 1000,
  }
);

  console.log(
    "✅ Draft cleanup repeat job registered"
  );
}