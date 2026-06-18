// services/s3Service.js
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { pipeline } from "stream/promises";
import s3 from "../s3.js"; // <-- Importing your exact s3.js client here!

const BUCKET = process.env.AWS_BUCKET_NAME;

/**
 * Downloads a file from S3 to a local temp path for FFmpeg to process.
 */
export const downloadFile = async (key, downloadPath) => {
  const command = new GetObjectCommand({ 
    Bucket: BUCKET, 
    Key: key 
  });
  
  const response = await s3.send(command);
  
  // Stream the file directly to the local hard drive
  const writeStream = fs.createWriteStream(downloadPath);
  await pipeline(response.Body, writeStream);
  
  return downloadPath;
};

/**
 * Uploads a locally processed file (optimized video or thumbnail) back to S3.
 */
export const uploadFile = async (filePath, key, contentType) => {
  const fileStream = fs.createReadStream(filePath);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  });
  
  await s3.send(command);
  
  // Return the constructed URL (adjust if you use CloudFront)
  if (process.env.GAMES_STORAGE_PRIVATE_CLOUDFRONT) {
    return `${process.env.GAMES_STORAGE_PRIVATE_CLOUDFRONT}/${key}`;
  }
  
  // Fallback to standard S3 URL if CloudFront isn't defined
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
};