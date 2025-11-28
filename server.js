import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path';
import multer from 'multer';
import { v4 as v4uuid } from 'uuid';
import {path as ffmpegpath} from '@ffmpeg-installer/ffmpeg';
import Ffmpeg from 'fluent-ffmpeg';
import fs from 'fs'
const app=express();

// configuration for ffmpeg
Ffmpeg.setFfmpegPath(ffmpegpath);
// Convert MP4 → HLS (.m3u8) and store output
function convertToHLS(inputFilePath, outputDir) {
    return new Promise((resolve, reject) => {
      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
  
      const outputM3u8 = path.join(outputDir, "index.m3u8");
  
      Ffmpeg(inputFilePath)
        .outputOptions([
          "-codec: copy",      // No re-encoding (fast)
          "-start_number 0",
          "-hls_time 10",      // Segment duration
          "-hls_list_size 0",  // Keep all segments
          "-f hls"
        ])
        .output(outputM3u8)
        .on("start", (cmd) => {
          console.log("FFmpeg command:", cmd);
        })
        .on("end", () => {
          console.log("HLS conversion finished");
          resolve(outputM3u8);
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .run();
    });
  }
  

// cors
app.use(cors({
    origin:"*"
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({extended:true}))

// multer setings
const storage=multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,"uploads/");
    },
    filename:function(req,file,cb){
        const uniqueFilename=`${Date.now()}-${v4uuid()}${path.extname(file.originalname)}`
        cb(null,uniqueFilename);
    }
})
// Allowed video MIME types
const VIDEO_TYPES = [
    "video/mp4",
    "video/mkv",
    "video/webm",
    "video/avi",
    "video/mov"
  ];
const upload=multer({storage,
    fileFilter:function(req,file,cd){
        if(!VIDEO_TYPES.includes(file.mimetype)){
            return cd(new Error("only video files are allowed"))
        }
        cd(null,true);
    }
});
// ----------------------------------------
app.get('/',(req,res,next)=>{
    res.send("Welcome");
})

app.post('/upload', async (req, res, next) => {
    upload.single("video")(req, res, async function (err) {
      // ----------------------
      // Multer Error Handling
      // ----------------------
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ error: "Only video files are allowed!" });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: "Something went wrong while uploading." });
      }
  
      // ----------------------
      // Successful upload
      // ----------------------
      try {
        const inputPath = req.file.path;
  
        // extract timestamp prefix (first part of filename)
        const timestamp = req.file.filename.split("-")[0];
  
        // correct output folder
        const outputDir = `./uploads/hls/${timestamp}`;
  
        // convert to HLS (m3u8 + ts segments)
        const m3u8Path = await convertToHLS(inputPath, outputDir);
  
        return res.status(200).json({
          message: "Video uploaded successfully!",
          playlist: m3u8Path,
          timestamp: timestamp
        });
  
      } catch (err) {
        console.error("HLS conversion error:", err);
        return res.status(500).json({ error: "Conversion failed" });
      }
    });
  });
  

// app listening
app.listen(3000,()=>{
    console.log("listenning")
})