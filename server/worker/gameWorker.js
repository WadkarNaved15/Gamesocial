import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "dns";

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

console.log("Connecting to MongoDB...");

await mongoose.connect(
  process.env.MONGO_URI,
  {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  }
);

console.log("✅ MongoDB Connected");

import "./publishGameWorker.js";
import "./draftCleanupWorker.js";
import "./videoWorker.js";

import { registerRepeatJobs } from "./registerRepeatJobs.js";

import GamePostDraft from "../models/GamePostDraft.js";
import { publishGameQueue } from "../queues/publishGameQueue.js";


async function recoverStuckDrafts() {
  const stuckDrafts =
    await GamePostDraft.find({
      status: "payment_completed",
      allPostId: null,
      creditPurchaseId: {
        $ne: null,
      },
    });

  if (!stuckDrafts.length) {
    console.log(
      "✅ No stuck drafts found"
    );
    return;
  }

  for (const draft of stuckDrafts) {
    try {
      await publishGameQueue.add(
        "publishGame",
        {
          draftId:
            draft._id.toString(),
          creditPurchaseId:
            draft.creditPurchaseId?.toString(),
        },
        {
          jobId: `publish-${draft._id}`,
          removeOnComplete: 100,
          removeOnFail: 100,
        }
      );

      console.log(
        `✅ Recovered draft ${draft._id}`
      );
    } catch (err) {
      console.error(
        `❌ Failed to recover draft ${draft._id}`,
        err
      );
    }
  }

  console.log(
    `Recovered ${stuckDrafts.length} stuck drafts`
  );
}

try {
  await registerRepeatJobs();

  console.log(
    "✅ Repeat jobs registered"
  );

  await recoverStuckDrafts();

  console.log(
    "🚀 Workers started"
  );
} catch (err) {
  console.error(
    "❌ Worker startup failed",
    err
  );
}

process.on(
  "SIGINT",
  async () => {
    console.log(
      "SIGINT received, shutting down..."
    );

    await mongoose.disconnect();

    process.exit(0);
  }
);

process.on(
  "SIGTERM",
  async () => {
    console.log(
      "SIGTERM received, shutting down..."
    );

    await mongoose.disconnect();

    process.exit(0);
  }
);