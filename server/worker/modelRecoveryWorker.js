import mongoose from "mongoose";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import dotenv from "dotenv";

dotenv.config();

const lambda = new LambdaClient({
  region: "ap-south-1",
});

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

async function invokeOptimizer(originalKey) {
  await lambda.send(
    new InvokeCommand({
      FunctionName: process.env.MODEL_OPTIMIZER_LAMBDA,
      InvocationType: "Event",
      Payload: Buffer.from(
        JSON.stringify({
          Records: [
            {
              s3: {
                bucket: {
                  name: process.env.S3_BUCKET,
                },
                object: {
                  key: originalKey,
                },
              },
            },
          ],
        })
      ),
    })
  );
}

async function main() {
  console.log(`[Recovery] started ${new Date().toISOString()}`);

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const db = mongoose.connection.db;
    const posts = db.collection("allposts");

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const cursor = posts
      .find({
        $or: [
          {
            "modelPost.assets": {
              $elemMatch: {
                "optimization.status": "failed",
                "optimization.retryCount": { $lt: MAX_RETRIES },
              },
            },
          },
          {
            "modelPost.assets": {
              $elemMatch: {
                "optimization.status": "processing",
                "optimization.updatedAt": { $lt: twoHoursAgo },
                "optimization.retryCount": { $lt: MAX_RETRIES },
              },
            },
          },
          {
            "adModelPost.asset.optimization.status": "failed",
            "adModelPost.asset.optimization.retryCount": { $lt: MAX_RETRIES },
          },
          {
            "adModelPost.asset.optimization.status": "processing",
            "adModelPost.asset.optimization.updatedAt": { $lt: twoHoursAgo },
            "adModelPost.asset.optimization.retryCount": { $lt: MAX_RETRIES },
          },
        ],
      })
      .limit(BATCH_SIZE * 2);

    let recovered = 0;

    for await (const post of cursor) {
      // Process modelPost assets
      if (post.modelPost?.assets) {
        for (const asset of post.modelPost.assets) {
          if (recovered >= BATCH_SIZE) break;

          const opt = asset.optimization;

          if (!opt || opt.retryCount >= MAX_RETRIES) continue;

          if (
            opt.status === "failed" ||
            (opt.status === "processing" && opt.updatedAt < twoHoursAgo)
          ) {
            console.log("Recovering", asset.originalKey);

            // Concurrency protection: verify retryCount matches what we expect
            const result = await posts.updateOne(
  {
    _id: post._id,
    "modelPost.assets.originalKey": asset.originalKey,
    "modelPost.assets.optimization.retryCount": {
      $lt: MAX_RETRIES,
    },
  },
  {
    $inc: {
      "modelPost.assets.$.optimization.retryCount": 1,
    },
    $set: {
      "modelPost.assets.$.optimization.status":
        "processing",

      "modelPost.assets.$.optimization.updatedAt":
        new Date(),

      "modelPost.assets.$.optimization.error":
        null,
    },
  }
);

            // If another worker beat us to it, skip
            if (!result.modifiedCount) continue;

            try {
              await invokeOptimizer(asset.originalKey);
              recovered++;
            } catch (err) {
              console.error(`Invoke failed for ${asset.originalKey}:`, err);

              // Revert status on invocation failure to prevent ghost jobs
             await posts.updateOne(
  {
    _id: post._id,
    "modelPost.assets.originalKey":
      asset.originalKey,
  },
  {
    $set: {
      "modelPost.assets.$.optimization.status":
        "failed",

      "modelPost.assets.$.optimization.error":
        err.message,

      "modelPost.assets.$.optimization.updatedAt":
        new Date(),
    },
  }
);
            }
          }
        }
      }

      if (recovered >= BATCH_SIZE) break;

      // Process adModelPost asset
      if (post.adModelPost?.asset) {
        const asset = post.adModelPost.asset;
        const opt = asset.optimization;

        if (
          opt &&
          opt.retryCount < MAX_RETRIES &&
          (opt.status === "failed" ||
            (opt.status === "processing" && opt.updatedAt < twoHoursAgo))
        ) {
          console.log("Recovering", asset.originalKey);

          // Concurrency protection
          const result = await posts.updateOne(
            {
              _id: post._id,
              "adModelPost.asset.optimization.retryCount": {
                $lt: MAX_RETRIES,
              },
            },
            {
              $inc: {
                "adModelPost.asset.optimization.retryCount": 1,
              },
              $set: {
                "adModelPost.asset.optimization.status": "processing",
                "adModelPost.asset.optimization.updatedAt": new Date(),
                "adModelPost.asset.optimization.error": null,
              },
            }
          );

          if (!result.modifiedCount) continue;

          try {
            await invokeOptimizer(asset.originalKey);
            recovered++;
          } catch (err) {
            console.error(`Invoke failed for ${asset.originalKey}:`, err);

            await posts.updateOne(
              {
                _id: post._id,
              },
              {
                $set: {
                  "adModelPost.asset.optimization.status": "failed",
                  "adModelPost.asset.optimization.error": err.message,
                  "adModelPost.asset.optimization.updatedAt": new Date(),
                },
              }
            );
          }
        }
      }

      if (recovered >= BATCH_SIZE) break;
    }

    console.log(`[Recovery] recovered ${recovered}`);
  } finally {
  if (mongoose.connection.readyState) {
    await mongoose.disconnect();
  }
}
}

main().catch((err) => {
  console.error("[Recovery] Fatal Error:", err);
  process.exit(1);
});