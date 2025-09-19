CREATE TABLE "recent_file_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"file_id" varchar NOT NULL,
	"view_type" text NOT NULL,
	"viewed_at" timestamp DEFAULT now()
);
