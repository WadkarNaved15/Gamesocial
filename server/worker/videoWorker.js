// workers/videoWorker.js

import { Worker } from "bullmq";
import { redisConfig } from "../config/redis.js";
import { downloadFile, uploadFile } from "../services/s3Service.js";
import {
  optimizeVideo,
  generateThumbnail,
} from "../services/ffmpegService.js";

import fs from "fs/promises";
import path from "path";
import os from "os";

import AllPost from "../models/Allposts.js";
import GamePostDraft from "../models/GamePostDraft.js";
import PrerollAd from "../models/PrerollAd.js";

const generateOptimizedKeys = (originalKey) => {
  const parsed = path.parse(originalKey);

  return {
    optimizedKey: `${parsed.dir}-optimized/${parsed.name}.mp4`,
    thumbnailKey: `${parsed.dir}-thumbnails/${parsed.name}.jpg`,
  };
};

async function updateDatabaseStatus(
  entityType,
  entityId,
  payload
) {
  switch (entityType) {
    /**
     * NORMAL POST VIDEO
     */
case "post": {
  await AllPost.updateOne(
    {
      _id: entityId,
      "normalPost.assets.url": payload.url,
    },
    {
      $set: {
        "normalPost.assets.$.optimizedUrl":
          payload.optimizedUrl,

        "normalPost.assets.$.optimizedKey":
          payload.optimizedKey,

        "normalPost.assets.$.thumbnailUrl":
          payload.thumbnailUrl,

        "normalPost.assets.$.processingStatus":
          payload.processingStatus,

        "normalPost.assets.$.processingError":
          payload.processingError || null,

        "normalPost.assets.$.processedAt":
          payload.processingStatus === "completed"
            ? new Date()
            : null,
      },
    }
  );

  break;
}

    /**
     * GAME DRAFT TRAILER
     */
    case "game": {
  const draft = await GamePostDraft.findById(entityId);

  if (!draft) {
    throw new Error(`Draft ${entityId} not found`);
  }

  const update = {
    processingStatus: payload.processingStatus,
  };

  if (payload.optimizedUrl)
    update.optimizedUrl = payload.optimizedUrl;

  if (payload.optimizedKey)
    update.optimizedKey = payload.optimizedKey;

  if (payload.thumbnailUrl)
    update.thumbnailUrl = payload.thumbnailUrl;

  if (payload.processingError)
    update.processingError = payload.processingError;

  if (payload.processingStatus === "completed") {
    update.processedAt = new Date();
  }

  // Always update draft
  await GamePostDraft.updateOne(
    { _id: draft._id },
    {
      $set: Object.fromEntries(
        Object.entries(update).map(([k, v]) => [
          `videoDemo.${k}`,
          v,
        ])
      ),
    }
  );

  // If already published, mirror into AllPost
  if (draft.allPostId) {
    await AllPost.updateOne(
      { _id: draft.allPostId },
      {
        $set: Object.fromEntries(
          Object.entries(update).map(([k, v]) => [
            `gamePost.videoDemo.${k}`,
            v,
          ])
        ),
      }
    );
  }

  break;
}

    /**
     * MEDIA AD POST
     */
    case "media_ad": {
      const update = {
        "mediaAdPost.asset.processingStatus":
          payload.processingStatus,
      };

      if (payload.optimizedUrl)
        update["mediaAdPost.asset.optimizedUrl"] =
          payload.optimizedUrl;

      if (payload.optimizedKey)
        update["mediaAdPost.asset.optimizedKey"] =
          payload.optimizedKey;

      if (payload.thumbnailUrl)
        update["mediaAdPost.asset.thumbnailUrl"] =
          payload.thumbnailUrl;

      if (payload.processingError)
        update["mediaAdPost.asset.processingError"] =
          payload.processingError;

      if (payload.processingStatus === "completed") {
        update["mediaAdPost.asset.processedAt"] =
          new Date();
      }

      await AllPost.findByIdAndUpdate(
        entityId,
        {
          $set: update,
        }
      );

      break;
    }

    /**
     * PREROLL AD
     */
case "preroll_ad": {
  const update = {
    "asset.processingStatus":
      payload.processingStatus,
  };

  if (payload.optimizedUrl)
    update["asset.optimizedUrl"] =
      payload.optimizedUrl;

  if (payload.optimizedKey)
    update["asset.optimizedKey"] =
      payload.optimizedKey;

  if (payload.thumbnailUrl)
    update["asset.thumbnailUrl"] =
      payload.thumbnailUrl;

  if (payload.processingError)
    update["asset.processingError"] =
      payload.processingError;

  if (payload.processingStatus === "completed") {
    update["asset.processedAt"] =
      new Date();
  }

  await PrerollAd.findByIdAndUpdate(
    entityId,
    {
      $set: update,
    }
  );

  break;
}

    default:
      throw new Error(
        `Unknown entity type: ${entityType}`
      );
  }
}

export const videoWorker = new Worker(
  "VideoProcessing",
  async (job) => {
    const {
      key,
      url,
      entityType,
      entityId,
    } = job.data;

    console.log(
      `[VideoWorker] Job ${job.id} STARTED`,
      {
        entityType,
        entityId,
        key,
      }
    );

    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "rigzer-video-")
    );

    const originalFile =
      path.join(tempDir, "original.mp4");

    const optimizedFile =
      path.join(tempDir, "optimized.mp4");

    try {
      await updateDatabaseStatus(
        entityType,
        entityId,
        {
          processingStatus: "processing",
          url,
        }
      );

      console.log(
        `[VideoWorker] Job ${job.id} Downloading original file`
      );

      await downloadFile(
        key,
        originalFile
      );

      console.log(
        `[VideoWorker] Job ${job.id} Download complete`
      );

      console.log(
        `[VideoWorker] Job ${job.id} VIDEO OPTIMIZATION STARTED`
      );

      const optimizeStart = Date.now();

      await optimizeVideo(
        originalFile,
        optimizedFile
      );

      console.log(
        `[VideoWorker] Job ${job.id} VIDEO OPTIMIZATION COMPLETED in ${
          Date.now() - optimizeStart
        } ms`
      );

      console.log(
        `[VideoWorker] Job ${job.id} THUMBNAIL GENERATION STARTED`
      );

      const thumbnailFile =
        await generateThumbnail(
          originalFile,
          tempDir,
          "thumbnail.jpg"
        );

      console.log(
        `[VideoWorker] Job ${job.id} THUMBNAIL GENERATION COMPLETED`
      );

      const {
        optimizedKey,
        thumbnailKey,
      } = generateOptimizedKeys(key);

      console.log(
        `[VideoWorker] Job ${job.id} UPLOADING OPTIMIZED VIDEO`
      );

      const optimizedUrl =
        await uploadFile(
          optimizedFile,
          optimizedKey,
          "video/mp4"
        );

      console.log(
        `[VideoWorker] Job ${job.id} OPTIMIZED VIDEO UPLOADED`
      );

      console.log(
        `[VideoWorker] Job ${job.id} UPLOADING THUMBNAIL`
      );

      const thumbnailUrl =
        await uploadFile(
          thumbnailFile,
          thumbnailKey,
          "image/jpeg"
        );

      console.log(
        `[VideoWorker] Job ${job.id} THUMBNAIL UPLOADED`
      );

      await updateDatabaseStatus(
        entityType,
        entityId,
        {
          processingStatus: "completed",
          optimizedUrl,
          optimizedKey,
          thumbnailUrl,
          url,
        }
      );

      console.log(
        `[VideoWorker] Job ${job.id} COMPLETED SUCCESSFULLY`
      );
    } catch (err) {
      console.error(
        `[VideoWorker] Job ${job.id} FAILED`,
        err
      );

      await updateDatabaseStatus(
        entityType,
        entityId,
        {
          processingStatus: "failed",
          processingError:
            err.message,
          url,
        }
      );

      throw err;
    } finally {
      console.log(
        `[VideoWorker] Job ${job.id} CLEANUP STARTED`
      );

      await fs.rm(tempDir, {
        recursive: true,
        force: true,
      });

      console.log(
        `[VideoWorker] Job ${job.id} CLEANUP COMPLETED`
      );
    }
  },
  {
    connection: redisConfig,
    concurrency: 2,
  }
);