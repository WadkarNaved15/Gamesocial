import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../config/sqsClient.js";

export const enqueuePostView = async (payload) => {
  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: process.env.POST_VIEW_QUEUE_URL,
      MessageBody: JSON.stringify(payload),
    })
  );
};