import "./publishGameWorker.js";
import "./draftCleanupWorker.js";

import { registerRepeatJobs } from "./registerRepeatJobs.js";

import GamePostDraft from "../models/GamePostDraft.js";
import { publishGameQueue } from "../queues/publishGameQueue.js";

async function recoverStuckDrafts() {
  const stuckDrafts = await GamePostDraft.find({
    status: "payment_completed",
    allPostId: null,
    creditPurchaseId: { $ne: null },
  });

  for (const draft of stuckDrafts) {
    try {
      await publishGameQueue.add(
        "publishGame",
        {
          draftId: draft._id.toString(),
          creditPurchaseId:
            draft.creditPurchaseId?.toString(),
        },
        {
          jobId: `publish-${draft._id}`,
        }
      );

      console.log(
        `Recovered draft ${draft._id}`
      );
    } catch (err) {
      console.error(
        `Failed to recover draft ${draft._id}`,
        err
      );
    }
  }

  console.log(
    `Recovered ${stuckDrafts.length} stuck drafts`
  );
}

await registerRepeatJobs();

console.log("Workers started");

await recoverStuckDrafts();