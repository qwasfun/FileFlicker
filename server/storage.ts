import { 
  users, directories, files, scanJobs, videoProgress,
  type User, type InsertUser,
  type Directory, type InsertDirectory,
  type File, type InsertFile,
  type ScanJob, type InsertScanJob,
  type VideoProgress, type InsertVideoProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, like, and } from "drizzle-orm";

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
        totalFiles: sql<number>`count(*)::int`,
        totalSize: sql<number>`sum(${files.size})::int`
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
    
    const conditions = fileIds.map(id => eq(files.id, id));
    return await db
      .select()
      .from(files)
      .where(and(...conditions));
  }
}

export const storage = new DatabaseStorage();
