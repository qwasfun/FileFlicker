import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fileScanner } from "./services/fileScanner";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get directories
  app.get("/api/directories", async (req, res) => {
    try {
      const directories = await storage.getDirectories();
      res.json(directories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch directories" });
    }
  });

  // Get files
  app.get("/api/files", async (req, res) => {
    try {
      const { directoryId, search } = req.query;
      const files = await storage.getFiles(
        directoryId as string, 
        search as string
      );
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  // Get file details
  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  // Download file
  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({ error: "File not found on disk" });
      }

      res.download(file.path, file.name);
    } catch (error) {
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Stream video file
  app.get("/api/files/:id/stream", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || file.type !== 'video') {
        return res.status(404).json({ error: "Video file not found" });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({ error: "Video file not found on disk" });
      }

      const stat = fs.statSync(file.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const fileStream = fs.createReadStream(file.path, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        fileStream.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(file.path).pipe(res);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stream video" });
    }
  });

  // Get subtitle files
  app.get("/api/files/:id/subtitles", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file || !file.subtitlePaths) {
        return res.json([]);
      }

      const subtitles = file.subtitlePaths.filter(subtitlePath => 
        fs.existsSync(subtitlePath)
      ).map(subtitlePath => ({
        path: subtitlePath,
        name: path.basename(subtitlePath),
        language: path.basename(subtitlePath, path.extname(subtitlePath)).split('.').pop() || 'unknown'
      }));

      res.json(subtitles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subtitles" });
    }
  });

  // Serve subtitle file
  app.get("/api/subtitles/*", (req, res) => {
    try {
      const subtitlePath = (req.params as any)["0"];
      if (!fs.existsSync(subtitlePath)) {
        return res.status(404).json({ error: "Subtitle file not found" });
      }

      res.sendFile(path.resolve(subtitlePath));
    } catch (error) {
      res.status(500).json({ error: "Failed to serve subtitle file" });
    }
  });

  // Get scan status
  app.get("/api/scan/status", async (req, res) => {
    try {
      const scanJob = await storage.getCurrentScanJob();
      res.json(scanJob || { status: 'idle', progress: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to get scan status" });
    }
  });

  // Start manual scan
  app.post("/api/scan/start", async (req, res) => {
    try {
      const scanDirectory = process.env.SCAN_DIRECTORY || "./data";
      await fileScanner.startScan(scanDirectory);
      res.json({ message: "Scan started successfully" });
    } catch (error) {
      if (error instanceof Error && error.message === "Scan already in progress") {
        res.status(409).json({ error: "Scan already in progress" });
      } else {
        res.status(500).json({ error: "Failed to start scan" });
      }
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getTotalStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Serve thumbnail images
  app.get("/api/thumbnails/*", (req, res) => {
    try {
      const thumbnailPath = (req.params as any)["0"];
      if (!fs.existsSync(thumbnailPath)) {
        return res.status(404).json({ error: "Thumbnail not found" });
      }

      res.sendFile(path.resolve(thumbnailPath));
    } catch (error) {
      res.status(500).json({ error: "Failed to serve thumbnail" });
    }
  });

  // Get video progress
  app.get("/api/video-progress/:fileId", async (req, res) => {
    try {
      const userId = "default-user"; // For now, use a default user
      const { fileId } = req.params;
      
      const progress = await storage.getVideoProgress(userId, fileId);
      res.json(progress || { currentTime: 0, duration: 0, isWatched: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to get video progress" });
    }
  });

  // Save video progress
  app.post("/api/video-progress/:fileId", async (req, res) => {
    try {
      const userId = "default-user"; // For now, use a default user
      const { fileId } = req.params;
      const { currentTime, duration, isWatched } = req.body;

      const progressData = {
        userId,
        fileId,
        currentTime: parseInt(currentTime) || 0,
        duration: parseInt(duration) || 0,
        isWatched: Boolean(isWatched),
        lastWatched: new Date(),
      };

      const progress = await storage.saveVideoProgress(progressData);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to save video progress" });
    }
  });

  // Get user's all video progress
  app.get("/api/video-progress", async (req, res) => {
    try {
      const userId = "default-user"; // For now, use a default user
      const progressList = await storage.getUserVideoProgress(userId);
      res.json(progressList);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user video progress" });
    }
  });

  // Get deleted files (files that exist in DB but not on disk)
  app.get("/api/cleanup/deleted-files", async (req, res) => {
    try {
      const deletedFileIds = fileScanner.getDeletedFiles();
      const deletedFiles = await storage.getDeletedFilesByIds(deletedFileIds);
      res.json(deletedFiles);
    } catch (error) {
      res.status(500).json({ error: "Failed to get deleted files" });
    }
  });

  // Cleanup deleted files from database
  app.post("/api/cleanup/delete-files", async (req, res) => {
    try {
      const { fileIds } = req.body;
      
      if (!Array.isArray(fileIds)) {
        return res.status(400).json({ error: "fileIds must be an array" });
      }

      await fileScanner.cleanupDeletedFiles(fileIds);
      res.json({ message: `Successfully cleaned up ${fileIds.length} files from database` });
    } catch (error) {
      res.status(500).json({ error: "Failed to cleanup deleted files" });
    }
  });

  // Get cleanup status (number of deleted files found)
  app.get("/api/cleanup/status", async (req, res) => {
    try {
      const deletedFileIds = fileScanner.getDeletedFiles();
      res.json({ 
        deletedFileCount: deletedFileIds.length,
        hasDeletedFiles: deletedFileIds.length > 0 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get cleanup status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
