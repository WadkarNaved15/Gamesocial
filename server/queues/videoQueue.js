import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.js";

export const videoProcessingQueue = new Queue('VideoProcessing', { connection: redisConfig });

 
