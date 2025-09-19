import cron from "node-cron";
import fs from "fs/promises";
import { Dirent, Stats } from "fs";
import path from "path";
import { storage } from "../storage";
import type { InsertDirectory, InsertFile } from "@shared/schema";

class FileScanner {
  private currentScanJob: string | null = null;
  private deletedFiles: string[] = []; // Track files that exist in DB but not on disk
  private emptyDirectories: string[] = []; // Track empty directories
  
  constructor() {
    // Get scan schedule from environment variable with default fallback
    const scanSchedule = process.env.SCAN_SCHEDULE || "0 */1 * * *"; // Default: every hour
    
    // Only schedule if scan schedule is not disabled
    if (scanSchedule !== "disabled") {
      cron.schedule(scanSchedule, () => {
        this.scheduledScan();
      });
      console.log(`Scheduled file scanning with cron expression: ${scanSchedule}`);
    } else {
      console.log("Automatic file scanning is disabled");
    }
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
      
      // Check for deleted files and empty directories after scanning
      await this.checkForDeletedFiles(scanJob.id);
      await this.checkForEmptyDirectories(scanJob.id);
      
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

      // Process subdirectories recursively
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const fullPath = path.join(dirPath, entry.name);
          await this.scanDirectory(fullPath, scanJobId, directory.id);
        }
      }

      // Batch process files in this directory
      await this.batchProcessFiles(entries, dirPath, directory.id);

    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
  }

  private async batchProcessFiles(entries: Dirent[], dirPath: string, directoryId: string): Promise<void> {
    const fileEntries = entries.filter(entry => entry.isFile());
    if (fileEntries.length === 0) return;

    // Collect file information
    const fileInfos: Array<{ entry: Dirent; fullPath: string; stats: Stats; extension: string; fileType: string }> = [];
    
    for (const entry of fileEntries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const fileStats = await fs.stat(fullPath);
        const extension = path.extname(entry.name).toLowerCase();
        const fileType = this.getFileType(extension);
        
        fileInfos.push({
          entry,
          fullPath,
          stats: fileStats,
          extension,
          fileType
        });
      } catch (error) {
        console.error(`Error getting stats for ${fullPath}:`, error);
      }
    }

    if (fileInfos.length === 0) return;

    // Batch query existing files
    const filePaths = fileInfos.map(info => info.fullPath);
    const existingFiles = await storage.getFilesByPaths(filePaths);
    const existingFileMap = new Map(existingFiles.map(file => [file.path, file]));

    // Separate files to create and update
    const filesToCreate: InsertFile[] = [];
    const filesToUpdate: { id: string; data: Partial<File> }[] = [];
    
    let fileCount = 0;
    let totalSize = 0;

    for (const info of fileInfos) {
      const existingFile = existingFileMap.get(info.fullPath);
      const needsUpdate = !existingFile || existingFile.modifiedAt !== info.stats.mtime;
      
      if (needsUpdate) {
        const fileData: InsertFile = {
          name: info.entry.name,
          path: info.fullPath,
          directoryId: directoryId,
          type: info.fileType,
          extension: info.extension,
          size: info.stats.size,
          modifiedAt: info.stats.mtime,
          hasSubtitles: false,
          subtitlePaths: []
        };

        // Check for subtitles if it's a video file
        if (info.fileType === 'video') {
          const subtitlePaths = await this.findSubtitleFiles(info.fullPath);
          fileData.hasSubtitles = subtitlePaths.length > 0;
          fileData.subtitlePaths = subtitlePaths;
        }

        if (existingFile) {
          filesToUpdate.push({ id: existingFile.id, data: fileData });
        } else {
          filesToCreate.push(fileData);
        }
      }

      fileCount++;
      totalSize += info.stats.size;
    }

    // Execute batch operations
    console.log(`Batch processing: ${filesToCreate.length} files to create, ${filesToUpdate.length} files to update`);
    
    if (filesToCreate.length > 0) {
      await storage.batchCreateFiles(filesToCreate);
    }
    
    if (filesToUpdate.length > 0) {
      await storage.batchUpdateFiles(filesToUpdate);
    }

    // Update directory stats
    await storage.updateDirectory(directoryId, {
      fileCount,
      totalSize
    });
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

  getEmptyDirectories(): string[] {
    return [...this.emptyDirectories];
  }

  async cleanupDeletedFiles(fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return;

    try {
      // Use batch deletion for better performance
      await storage.batchDeleteFiles(fileIds);
      
      // Remove all successfully deleted files from tracking list
      for (const fileId of fileIds) {
        const index = this.deletedFiles.indexOf(fileId);
        if (index > -1) {
          this.deletedFiles.splice(index, 1);
        }
      }
      
      console.log(`Batch cleanup completed: deleted ${fileIds.length} files from database`);
    } catch (error) {
      console.error(`Error during batch cleanup of ${fileIds.length} files:`, error);
      throw error; // Re-throw to allow API route to handle error response
    }
  }

  private async checkForEmptyDirectories(scanJobId: string): Promise<void> {
    console.log("Checking for empty directories...");
    this.emptyDirectories = [];

    try {
      // Get empty directories from database (directories with no files and no subdirectories)
      const emptyDirs = await storage.getEmptyDirectories();
      
      for (const directory of emptyDirs) {
        try {
          // Check if directory still exists on disk
          const stats = await fs.stat(directory.path);
          if (!stats.isDirectory()) {
            this.emptyDirectories.push(directory.id);
            console.log(`Found directory that is no longer a directory: ${directory.name} (${directory.path})`);
            continue;
          }

          // Check if directory is actually empty on disk
          const files = await fs.readdir(directory.path);
          if (files.length === 0) {
            this.emptyDirectories.push(directory.id);
            console.log(`Found empty directory: ${directory.name} (${directory.path})`);
          }
        } catch (error) {
          // Directory doesn't exist on disk anymore
          this.emptyDirectories.push(directory.id);
          console.log(`Found deleted directory: ${directory.name} (${directory.path})`);
        }
      }

      if (this.emptyDirectories.length > 0) {
        console.log(`Found ${this.emptyDirectories.length} empty directories`);
      }
    } catch (error) {
      console.error("Error checking for empty directories:", error);
    }
  }

  async cleanupEmptyDirectories(directoryIds: string[]): Promise<void> {
    if (directoryIds.length === 0) return;

    try {
      // Use batch deletion for better performance
      await storage.batchDeleteDirectories(directoryIds);
      
      // Remove all successfully deleted directories from tracking list
      for (const directoryId of directoryIds) {
        const index = this.emptyDirectories.indexOf(directoryId);
        if (index > -1) {
          this.emptyDirectories.splice(index, 1);
        }
      }
      
      console.log(`Batch cleanup completed: deleted ${directoryIds.length} directories from database`);
    } catch (error) {
      console.error(`Error during batch cleanup of ${directoryIds.length} directories:`, error);
      throw error; // Re-throw to allow API route to handle error response
    }
  }
}

export const fileScanner = new FileScanner();
