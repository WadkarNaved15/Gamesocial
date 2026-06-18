// services/ffmpegService.js
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';

// Tell fluent-ffmpeg exactly where to find the local binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Optimizes video for web feed playback.
 * Target: ~3-4MB from 50MB.
 */
export const optimizeVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vcodec libx264',
        '-crf 28',                 
        '-preset faster',          
        '-maxrate 1500k',          
        '-bufsize 3000k',
        '-vf scale=-2:720',        
        '-r 30',                   
        '-acodec aac',             
        '-b:a 128k',               
        '-movflags +faststart'     
      ])
      .save(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err));
  });
};

/**
 * Extracts a thumbnail at the 1-second mark.
 */
export const generateThumbnail = (inputPath, outputDir, filename) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ['00:00:01'],
        folder: outputDir,
        filename: filename,
        size: '?x720' 
      })
      .on('end', () => resolve(path.join(outputDir, filename)))
      .on('error', (err) => reject(err));
  });
};