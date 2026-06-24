import { SQSClient } from "@aws-sdk/client-sqs";

console.log("SQS AWS_REGION =", process.env.AWS_REGION);
console.log("SQS_QUEUE_URL =", process.env.SQS_QUEUE_URL);

export const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SQS_SECRET_ACCESS_KEY,
  },
});
