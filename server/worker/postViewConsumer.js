import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { sqsClient } from "../config/sqsClient.js";
import AllPost from "../models/Allposts.js";
import PostViewEvent from "../models/postViewEvent.js";
import PostAnalytics from "../models/postAnalytics.js";

const QUEUE_URL = process.env.POST_VIEW_QUEUE_URL;

if (!QUEUE_URL) {
  throw new Error("POST_VIEW_QUEUE_URL is not set");
}

const WAIT_TIME_SECONDS = 20;
const MAX_MESSAGES = 10;
const POLL_DELAY_MS = 1000;

const ALLOWED_SOURCES = ["feed", "profile", "search", "direct", "share", "other"];
const ALLOWED_DEVICE_TYPES = ["desktop", "mobile", "tablet", "other"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeValue = (value, allowed, fallback) =>
  allowed.includes(value) ? value : fallback;

async function processViewMessage(message) {
  const payload = JSON.parse(message.Body || "{}");

  const {
    postId,
    viewerId,
    source = "other",
    deviceType = "other",
    watchTimeMs = 0,
    isUnique = false,
    viewedAt = new Date().toISOString(),
  } = payload;

  if (!postId || !viewerId) {
    throw new Error("Invalid payload: postId and viewerId are required");
  }

  const safeSource = normalizeValue(source, ALLOWED_SOURCES, "other");
  const safeDeviceType = normalizeValue(deviceType, ALLOWED_DEVICE_TYPES, "other");

  await AllPost.updateOne(
    { _id: postId },
    {
      $inc: {
        viewsCount: 1,
        ...(isUnique ? { uniqueViewsCount: 1 } : {}),
      },
    }
  );

  await PostViewEvent.create({
    post: postId,
    viewer: viewerId,
    source: safeSource,
    deviceType: safeDeviceType,
    watchTimeMs: Number(watchTimeMs) || 0,
    isUnique: Boolean(isUnique),
    viewedAt: new Date(viewedAt),
  });

  const analyticsUpdate = {
    $inc: {
      totalViews: 1,
      totalWatchTimeMs: Number(watchTimeMs) || 0,
      ...(isUnique ? { uniqueViews: 1 } : {}),
    },
    $set: {
      lastViewedAt: new Date(viewedAt),
    },
  };

  analyticsUpdate.$inc[`viewsBySource.${safeSource}`] = 1;
  analyticsUpdate.$inc[`viewsByDevice.${safeDeviceType}`] = 1;

  await PostAnalytics.findOneAndUpdate(
    { post: postId },
    analyticsUpdate,
    { upsert: true, new: true }
  );
}

async function deleteSqsMessage(receiptHandle) {
  await sqsClient.send(
    new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: receiptHandle,
    })
  );
}

export async function startViewSQSConsumer() {
  console.log("✅ View worker started");

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: MAX_MESSAGES,
          WaitTimeSeconds: WAIT_TIME_SECONDS,
          VisibilityTimeout: 60,
          AttributeNames: ["All"],
          MessageAttributeNames: ["All"],
        })
      );

      const messages = response.Messages || [];

      if (!messages.length) {
        await sleep(POLL_DELAY_MS);
        continue;
      }

      for (const message of messages) {
        try {
          await processViewMessage(message);
          await deleteSqsMessage(message.ReceiptHandle);
        } catch (err) {
          console.error("Failed to process post view message:", err);
        }
      }
    } catch (err) {
      console.error("SQS polling error:", err);
      await sleep(2000);
    }
  }
}