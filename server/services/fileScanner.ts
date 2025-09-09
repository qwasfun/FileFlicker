import cron from "node-cron";
import fs from "fs/promises";
import path from "path";
import { storage } from "../storage";
import type { InsertDirectory, InsertFile } from "@shared/schema";

class FileScanner {
  private currentScanJob: string | null = null;
  private deletedFiles: string[] = []; // Track files that exist in DB but not on disk
  
  constructor() {
    // Schedule scan every 5 minutes
    cron.schedule("*/5 * * * *", () => {
      this.scheduledScan();
    });
  }

  private async scheduledScan() {
    const scanDirectory = process.env.SCAN_DIRECTORY || "data";
    if (this.currentScanJob) {
      console.log("Scan already in progress, skipping scheduled scan");
      return;
    }

    console.log("Starting scheduled directory scan");
    await this.startScan(scanDirectory);
  }

  async startScan(directory: string): Promise<void> {
    if (this.currentScanJob) {
      throw new Error("Scan already in progress");
    }

    try {
      await fs.access(directory);
    } catch (error) {
      throw new Error(`Directory not accessible: ${directory}`);
    }

    const scanJob = await storage.createScanJob({
      status: "scanning",
      progress: 0,
      startedAt: new Date()
    });

    this.currentScanJob = scanJob.id;

    try {
      await this.scanDirectory(directory, scanJob.id);
      
      // Check for deleted files after scanning
      await this.checkForDeletedFiles(scanJob.id);
      
      await storage.updateScanJob(scanJob.id, {
        status: "completed",
        progress: 100,
        completedAt: new Date()
      });
    } catch (error) {
      await storage.updateScanJob(scanJob.id, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date()
      });
      throw error;
    } finally {
      this.currentScanJob = null;
    }
  }

  private async scanDirectory(dirPath: string, scanJobId: string, parentId?: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      // Create or update directory record
      let directory = await storage.getDirectoryByPath(dirPath);
      if (!directory) {
        const directoryData: InsertDirectory = {
          name: path.basename(dirPath),
          path: dirPath,
          parentId: parentId || null
        };
        directory = await storage.createDirectory(directoryData);
      }

      let fileCount = 0;
      let totalSize = 0;

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, scanJobId, directory.id);
        } else if (entry.isFile()) {
          const fileStats = await fs.stat(fullPath);
          const extension = path.extname(entry.name).toLowerCase();
          const fileType = this.getFileType(extension);
          
          let existingFile = await storage.getFileByPath(fullPath);
          
          if (!existingFile || existingFile.modifiedAt !== fileStats.mtime) {
            const fileData: InsertFile = {
              name: entry.name,
              path: fullPath,
              directoryId: directory.id,
              type: fileType,
              extension: extension,
              size: fileStats.size,
              modifiedAt: fileStats.mtime,
              hasSubtitles: false,
              subtitlePaths: []
            };

            // Check for subtitles if it's a video file
            if (fileType === 'video') {
              const subtitlePaths = await this.findSubtitleFiles(fullPath);
              fileData.hasSubtitles = subtitlePaths.length > 0;
              fileData.subtitlePaths = subtitlePaths;
            }

            if (existingFile) {
              await storage.updateFile(existingFile.id, fileData);
            } else {
              await storage.createFile(fileData);
            }
          }

          fileCount++;
          totalSize += fileStats.size;
        }
      }

      // Update directory stats
      await storage.updateDirectory(directory.id, {
        fileCount,
        totalSize
      });

    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  private getFileType(extension: string): string {
    const videoExts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
    const audioExts = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'];
    const docExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.ppt', '.pptx'];

    if (videoExts.includes(extension)) return 'video';
    if (imageExts.includes(extension)) return 'image';
    if (audioExts.includes(extension)) return 'audio';
    if (docExts.includes(extension)) return 'document';
    
    return 'other';
  }

  private async findSubtitleFiles(videoPath: string): Promise<string[]> {
    const baseName = path.parse(videoPath).name;
    const directory = path.dirname(videoPath);
    const subtitleExts = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
    
    const subtitlePaths: string[] = [];

    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (subtitleExts.includes(ext)) {
          const fileBaseName = path.parse(file).name;
          
          // Check if subtitle file matches video file name
          if (fileBaseName.startsWith(baseName)) {
            subtitlePaths.push(path.join(directory, file));
          }
        }
      }
    } catch (error) {
      console.error(`Error finding subtitle files for ${videoPath}:`, error);
    }

    return subtitlePaths;
  }

  private async checkForDeletedFiles(scanJobId: string): Promise<void> {
    console.log("Checking for deleted files...");
    this.deletedFiles = [];

    try {
      // Get all files from database
      const allFiles = await storage.getAllFiles();
      
      for (const file of allFiles) {
        try {
          // Check if file still exists on disk
          await fs.access(file.path);
        } catch (error) {
          // File doesn't exist on disk anymore
          this.deletedFiles.push(file.id);
          console.log(`Found deleted file: ${file.name} (${file.path})`);
        }
      }

      if (this.deletedFiles.length > 0) {
        console.log(`Found ${this.deletedFiles.length} deleted files`);
      }
    } catch (error) {
      console.error("Error checking for deleted files:", error);
    }
  }

  getDeletedFiles(): string[] {
    return [...this.deletedFiles];
  }

  async cleanupDeletedFiles(fileIds: string[]): Promise<void> {
    for (const fileId of fileIds) {
      try {
        await storage.deleteFile(fileId);
        // Remove from our tracking list
        const index = this.deletedFiles.indexOf(fileId);
        if (index > -1) {
          this.deletedFiles.splice(index, 1);
        }
        console.log(`Cleaned up deleted file with ID: ${fileId}`);
      } catch (error) {
        console.error(`Error cleaning up file ${fileId}:`, error);
      }
    }
  }
}

export const fileScanner = new FileScanner();
