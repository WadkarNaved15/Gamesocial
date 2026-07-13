import {
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
let running = true;

process.on("SIGINT", () => {
  console.log("Worker shutting down...");
  running = false;
});
import { sqsClient } from "../config/sqsClient.js";
import { dispatchNotificationEvent } from "./eventHandlers/index.js";
export const startSQSConsumer = async () => {
  console.log("Notification Worker Started...");

  while (running) {
    try {
      const data = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
          VisibilityTimeout:30
        })
      );

      if (!data.Messages) continue;

      await Promise.all(
        data.Messages.map(async (msg) => {
          const event = JSON.parse(msg.Body);

          await dispatchNotificationEvent(event);

          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: process.env.SQS_QUEUE_URL,
              ReceiptHandle: msg.ReceiptHandle,
            })
          );
        })
      );
    } catch (err) {
      console.error("❌ Worker Error:", err);

      // backoff
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};
