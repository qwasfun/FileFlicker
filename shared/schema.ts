import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const directories = pgTable("directories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  parentId: varchar("parent_id"),
  fileCount: integer("file_count").default(0),
  totalSize: bigint('total_size', { mode: 'number'}).default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  directoryId: varchar("directory_id").notNull(),
  type: text("type").notNull(), // 'video', 'image', 'audio', 'document', 'other'
  extension: text("extension").notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  thumbnailPath: text("thumbnail_path"),
  duration: integer("duration"), // for video/audio files in seconds
  width: integer("width"), // for images/videos
  height: integer("height"), // for images/videos
  hasSubtitles: boolean("has_subtitles").default(false),
  subtitlePaths: text("subtitle_paths").array(), // array of subtitle file paths
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  modifiedAt: timestamp("modified_at"),
});

export const scanJobs = pgTable("scan_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").notNull().default("idle"), // 'idle', 'scanning', 'completed', 'error'
  progress: integer("progress").default(0), // 0-100
  totalFiles: integer("total_files").default(0),
  processedFiles: integer("processed_files").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  error: text("error"),
});

export const videoProgress = pgTable("video_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fileId: varchar("file_id").notNull(),
  currentTime: integer("current_time").default(0), // Progress in seconds
  duration: integer("duration").default(0), // Total duration in seconds
  isWatched: boolean("is_watched").default(false), // Mark as watched when >90% viewed
  lastWatched: timestamp("last_watched").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDirectorySchema = createInsertSchema(directories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScanJobSchema = createInsertSchema(scanJobs).omit({
  id: true,
});

export const insertVideoProgressSchema = createInsertSchema(videoProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Directory = typeof directories.$inferSelect;
export type InsertDirectory = z.infer<typeof insertDirectorySchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type ScanJob = typeof scanJobs.$inferSelect;
export type InsertScanJob = z.infer<typeof insertScanJobSchema>;
export type VideoProgress = typeof videoProgress.$inferSelect;
export type InsertVideoProgress = z.infer<typeof insertVideoProgressSchema>;
