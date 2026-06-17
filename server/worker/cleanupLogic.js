// workers/cleanupLogic.js

import {
  S3Client,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

import GamePostDraft from "../models/GamePostDraft.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:
      process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET =
  process.env.AWS_S3_BUCKET;

const STALE_AFTER_MS =
  10 * 24 * 60 * 60 * 1000; // 10 days  

export async function runDraftCleanup() {
  const cutoff =
    new Date(
      Date.now() - STALE_AFTER_MS
    );

  const staleDrafts =
    await GamePostDraft.find({
      status: {
        $in: [
          "draft",
          "uploading",
          "ready_for_payment",
          "payment_pending",
        ],
      },

      creditPurchaseId: null,

      $or: [
        {
          createdAt: {
            $lt: cutoff,
          },
        },
        {
          "buildFile.uploadedAt": {
            $lt: cutoff,
          },
        },
        {
          "videoDemo.uploadedAt": {
            $lt: cutoff,
          },
        },
      ],
    });

  if (!staleDrafts.length) {
    return;
  }

  const keys = [];

  for (const draft of staleDrafts) {
    if (draft.buildFile?.key) {
      keys.push({
        Key: draft.buildFile.key,
      });
    }

    if (draft.videoDemo?.key) {
      keys.push({
        Key: draft.videoDemo.key,
      });
    }
  }

  if (keys.length) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: keys,
        },
      })
    );
  }

  await GamePostDraft.deleteMany({
    _id: {
      $in: staleDrafts.map(
        (d) => d._id
      ),
    },
  });

  console.log(
    `Deleted ${staleDrafts.length} stale drafts`
  );
}