// services/ffmpegService.js
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

export const optimizeVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",

        // Better quality than CRF 28
        "-crf 23",

        // Better compression efficiency
        "-preset medium",

        // Only downscale if taller than 720p
        // 1080p -> 720p
        // 720p -> 720p
        // 480p -> 480p
        "-vf scale='if(gt(ih,720),-2,iw)':'if(gt(ih,720),720,ih)'",

        // Feed-friendly framerate
        "-r 30",

        // Audio
        "-c:a aac",
        "-b:a 128k",

        // Start playback before full download
        "-movflags +faststart",

        // Better browser compatibility
        "-pix_fmt yuv420p",

        // Optimize for streaming
        "-profile:v main",
        "-level 4.0",
      ])
      .save(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err));
  });
};

/**
 * Extracts a thumbnail at the 1-second mark.
 */
export const generateThumbnail = (
  inputPath,
  outputDir,
  filename
) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ["00:00:01"],
        folder: outputDir,
        filename,
        size: "?x720",
      })
      .on("end", () =>
        resolve(path.join(outputDir, filename))
      )
      .on("error", (err) => reject(err));
  });
};