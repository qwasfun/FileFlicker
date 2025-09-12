import { 
  users, directories, files, scanJobs, videoProgress,
  type User, type InsertUser,
  type Directory, type InsertDirectory,
  type File, type InsertFile,
  type ScanJob, type InsertScanJob,
  type VideoProgress, type InsertVideoProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, like, and, or, inArray, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Directory operations
  getDirectories(): Promise<Directory[]>;
  getDirectory(id: string): Promise<Directory | undefined>;
  getDirectoryByPath(path: string): Promise<Directory | undefined>;
  createDirectory(directory: InsertDirectory): Promise<Directory>;
  updateDirectory(id: string, updates: Partial<Directory>): Promise<Directory>;
  deleteDirectory(id: string): Promise<void>;
  getEmptyDirectories(): Promise<Directory[]>;
  getChildDirectories(parentId: string): Promise<Directory[]>;
  
  // File operations
  getFiles(directoryId?: string, search?: string): Promise<File[]>;
  getFile(id: string): Promise<File | undefined>;
  getFileByPath(path: string): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File>;
  deleteFile(id: string): Promise<void>;
  
  // Scan job operations
  getCurrentScanJob(): Promise<ScanJob | undefined>;
  createScanJob(job: InsertScanJob): Promise<ScanJob>;
  updateScanJob(id: string, updates: Partial<ScanJob>): Promise<ScanJob>;
  
  // Statistics
  getTotalStats(): Promise<{ totalFiles: number; totalSize: number }>;
  
  // Video progress operations
  getVideoProgress(userId: string, fileId: string): Promise<VideoProgress | undefined>;
  saveVideoProgress(progress: InsertVideoProgress): Promise<VideoProgress>;
  updateVideoProgress(userId: string, fileId: string, updates: Partial<VideoProgress>): Promise<VideoProgress>;
  getUserVideoProgress(userId: string): Promise<VideoProgress[]>;
  
  // File cleanup operations
  getAllFiles(): Promise<File[]>;
  getDeletedFilesByIds(fileIds: string[]): Promise<File[]>;
  
  // Batch operations
  getFilesByPaths(paths: string[]): Promise<File[]>;
  batchCreateFiles(files: InsertFile[]): Promise<File[]>;
  batchUpdateFiles(updates: { id: string; data: Partial<File> }[]): Promise<File[]>;
  batchDeleteFiles(fileIds: string[]): Promise<void>;
  
  // Treemap data
  getTreemapData(): Promise<TreemapNode>;
}

export interface TreemapNode {
  name: string;
  value?: number;
  size?: number;
  type?: 'directory' | 'file';
  path?: string;
  id?: string;
  children?: TreemapNode[];
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getDirectories(): Promise<Directory[]> {
    return await db.select().from(directories);
  }

  async getDirectory(id: string): Promise<Directory | undefined> {
    const [directory] = await db.select().from(directories).where(eq(directories.id, id));
    return directory || undefined;
  }

  async getDirectoryByPath(path: string): Promise<Directory | undefined> {
    const [directory] = await db.select().from(directories).where(eq(directories.path, path));
    return directory || undefined;
  }

  async createDirectory(directory: InsertDirectory): Promise<Directory> {
    const [created] = await db
      .insert(directories)
      .values(directory)
      .returning();
    return created;
  }

  async updateDirectory(id: string, updates: Partial<Directory>): Promise<Directory> {
    const [updated] = await db
      .update(directories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(directories.id, id))
      .returning();
    return updated;
  }

  async deleteDirectory(id: string): Promise<void> {
    await db.delete(directories).where(eq(directories.id, id));
  }

  async getEmptyDirectories(): Promise<Directory[]> {
    // Find directories with no files (fileCount = 0 or null)
    const emptyDirs = await db
      .select()
      .from(directories)
      .where(or(eq(directories.fileCount, 0), isNull(directories.fileCount)));
    
    // Filter out directories that have child directories
    const result: Directory[] = [];
    for (const dir of emptyDirs) {
      const childDirs = await this.getChildDirectories(dir.id);
      if (childDirs.length === 0) {
        result.push(dir);
      }
    }
    
    return result;
  }

  async getChildDirectories(parentId: string): Promise<Directory[]> {
    return await db
      .select()
      .from(directories)
      .where(eq(directories.parentId, parentId));
  }

  async getFiles(directoryId?: string, search?: string): Promise<File[]> {
    const conditions = [];
    
    if (directoryId) {
      conditions.push(eq(files.directoryId, directoryId));
    }
    
    if (search) {
      conditions.push(like(files.name, `%${search}%`));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(files).where(and(...conditions)).orderBy(desc(files.updatedAt));
    }
    
    return await db.select().from(files).orderBy(desc(files.updatedAt));
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file || undefined;
  }

  async getFileByPath(path: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.path, path));
    return file || undefined;
  }

  async createFile(file: InsertFile): Promise<File> {
    const [created] = await db
      .insert(files)
      .values(file)
      .returning();
    return created;
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File> {
    const [updated] = await db
      .update(files)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return updated;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async getCurrentScanJob(): Promise<ScanJob | undefined> {
    const [job] = await db.select().from(scanJobs).orderBy(desc(scanJobs.startedAt)).limit(1);
    return job || undefined;
  }

  async createScanJob(job: InsertScanJob): Promise<ScanJob> {
    const [created] = await db
      .insert(scanJobs)
      .values(job)
      .returning();
    return created;
  }

  async updateScanJob(id: string, updates: Partial<ScanJob>): Promise<ScanJob> {
    const [updated] = await db
      .update(scanJobs)
      .set(updates)
      .where(eq(scanJobs.id, id))
      .returning();
    return updated;
  }

  async getTotalStats(): Promise<{ totalFiles: number; totalSize: number }> {
    const result = await db
      .select({
        totalFiles: sql<number>`count(*)::bigint`,
        totalSize: sql<number>`sum(${files.size})::bigint`
      })
      .from(files);
    
    return {
      totalFiles: result[0]?.totalFiles || 0,
      totalSize: result[0]?.totalSize || 0
    };
  }

  async getVideoProgress(userId: string, fileId: string): Promise<VideoProgress | undefined> {
    const [progress] = await db
      .select()
      .from(videoProgress)
      .where(and(eq(videoProgress.userId, userId), eq(videoProgress.fileId, fileId)));
    return progress || undefined;
  }

  async saveVideoProgress(progress: InsertVideoProgress): Promise<VideoProgress> {
    const existing = await this.getVideoProgress(progress.userId, progress.fileId);
    
    if (existing) {
      return await this.updateVideoProgress(progress.userId, progress.fileId, {
        currentTime: progress.currentTime,
        duration: progress.duration,
        isWatched: progress.isWatched,
        lastWatched: new Date(),
      });
    }

    const [created] = await db
      .insert(videoProgress)
      .values(progress)
      .returning();
    return created;
  }

  async updateVideoProgress(userId: string, fileId: string, updates: Partial<VideoProgress>): Promise<VideoProgress> {
    const [updated] = await db
      .update(videoProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(videoProgress.userId, userId), eq(videoProgress.fileId, fileId)))
      .returning();
    return updated;
  }

  async getUserVideoProgress(userId: string): Promise<VideoProgress[]> {
    return await db
      .select()
      .from(videoProgress)
      .where(eq(videoProgress.userId, userId))
      .orderBy(desc(videoProgress.lastWatched));
  }

  async getAllFiles(): Promise<File[]> {
    return await db.select().from(files);
  }

  async getDeletedFilesByIds(fileIds: string[]): Promise<File[]> {
    if (fileIds.length === 0) return [];
    
    return await db
      .select()
      .from(files)
      .where(inArray(files.id, fileIds));
  }

  async getFilesByPaths(paths: string[]): Promise<File[]> {
    if (paths.length === 0) return [];
    
    const conditions = paths.map(path => eq(files.path, path));
    return await db
      .select()
      .from(files)
      .where(or(...conditions));
  }

  async batchCreateFiles(filesToCreate: InsertFile[]): Promise<File[]> {
    if (filesToCreate.length === 0) return [];
    
    return await db
      .insert(files)
      .values(filesToCreate)
      .returning();
  }

  async batchUpdateFiles(updates: { id: string; data: Partial<File> }[]): Promise<File[]> {
    if (updates.length === 0) return [];
    
    const results: File[] = [];
    
    // Use individual updates since PostgreSQL batch updates with different values are complex
    for (const update of updates) {
      const [updated] = await db
        .update(files)
        .set({ ...update.data, updatedAt: new Date() })
        .where(eq(files.id, update.id))
        .returning();
      if (updated) results.push(updated);
    }
    
    return results;
  }

  async batchDeleteFiles(fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return;
    
    // Chunk large arrays to avoid SQL parameter limits
    const chunkSize = 500;
    for (let i = 0; i < fileIds.length; i += chunkSize) {
      const chunk = fileIds.slice(i, i + chunkSize);
      await db.delete(files).where(inArray(files.id, chunk));
    }
  }

  async getTreemapData(): Promise<TreemapNode> {
    // Get all directories and files
    const allDirectories = await db.select().from(directories);
    const allFiles = await db.select().from(files);
    
    // Create lookup maps for performance
    const directoryMap = new Map(allDirectories.map(dir => [dir.id, dir]));
    const filesByDirectory = new Map<string, File[]>();
    const childrenByParent = new Map<string | null, Directory[]>();
    
    // Group files by directory
    allFiles.forEach(file => {
      if (!filesByDirectory.has(file.directoryId)) {
        filesByDirectory.set(file.directoryId, []);
      }
      filesByDirectory.get(file.directoryId)!.push(file);
    });
    
    // Group directories by parent
    allDirectories.forEach(dir => {
      if (!childrenByParent.has(dir.parentId)) {
        childrenByParent.set(dir.parentId, []);
      }
      childrenByParent.get(dir.parentId)!.push(dir);
    });
    
    // Build tree recursively
    const buildTreeNode = (directory: Directory | null, isRoot = false): TreemapNode => {
      const dirId = directory?.id || null;
      const dirName = directory ? directory.name : 'Root';
      const dirPath = directory ? directory.path : '';
      
      const children: TreemapNode[] = [];
      let totalSize = 0;
      
      // Add child directories
      const childDirs = childrenByParent.get(dirId) || [];
      for (const childDir of childDirs) {
        const childNode = buildTreeNode(childDir);
        children.push(childNode);
        totalSize += childNode.value || 0;
      }
      
      // Add files in this directory
      const filesInDir = directory ? (filesByDirectory.get(directory.id) || []) : [];
      for (const file of filesInDir) {
        children.push({
          name: file.name,
          value: Number(file.size),
          size: Number(file.size),
          type: 'file' as const,
          path: file.path,
          id: file.id
        });
        totalSize += Number(file.size);
      }
      
      return {
        name: dirName,
        value: totalSize,
        size: totalSize,
        type: 'directory' as const,
        path: dirPath,
        id: directory?.id,
        children: children.length > 0 ? children : undefined
      };
    };
    
    // Start with root directories (parentId is null)
    const rootDirectories = childrenByParent.get(null) || [];
    
    if (rootDirectories.length === 1) {
      // If there's only one root directory, use it as the root
      return buildTreeNode(rootDirectories[0]);
    } else {
      // If there are multiple root directories or none, create a virtual root
      return buildTreeNode(null, true);
    }
  }
}

export const storage = new DatabaseStorage();
