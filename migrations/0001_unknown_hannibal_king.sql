CREATE TABLE "video_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_id" varchar NOT NULL,
	"current_time" integer DEFAULT 0,
	"duration" integer DEFAULT 0,
	"is_watched" boolean DEFAULT false,
	"last_watched" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
