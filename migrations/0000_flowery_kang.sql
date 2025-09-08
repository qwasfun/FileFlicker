CREATE TABLE "directories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"parent_id" varchar,
	"file_count" integer DEFAULT 0,
	"total_size" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "directories_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"directory_id" varchar NOT NULL,
	"type" text NOT NULL,
	"extension" text NOT NULL,
	"size" integer NOT NULL,
	"thumbnail_path" text,
	"duration" integer,
	"width" integer,
	"height" integer,
	"has_subtitles" boolean DEFAULT false,
	"subtitle_paths" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"modified_at" timestamp,
	CONSTRAINT "files_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "scan_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"progress" integer DEFAULT 0,
	"total_files" integer DEFAULT 0,
	"processed_files" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
