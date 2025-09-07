import { 
  users, directories, files, scanJobs,
  type User, type InsertUser,
  type Directory, type InsertDirectory,
  type File, type InsertFile,
  type ScanJob, type InsertScanJob
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, like } from "drizzle-orm";

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
    let query = db.select().from(files);
    
    if (directoryId) {
      query = query.where(eq(files.directoryId, directoryId));
    }
    
    if (search) {
      query = query.where(like(files.name, `%${search}%`));
    }
    
    return await query.orderBy(desc(files.updatedAt));
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
}

export const storage = new DatabaseStorage();
