CREATE TABLE "cohorts" (
	"id" text PRIMARY KEY NOT NULL,
	"programme" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"visibility" text DEFAULT 'hidden' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"writeup" text DEFAULT '' NOT NULL,
	"hack_day" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"week" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"post_to_telegram" boolean DEFAULT true NOT NULL,
	"telegram_posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text NOT NULL,
	"track_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"programme" text NOT NULL,
	"cohort_id" text,
	"track_id" integer,
	"made_for" text DEFAULT '' NOT NULL,
	"built_with" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"cards" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"team" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tech_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"demo_url" text DEFAULT '' NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"live_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"winner" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"week" integer NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"teaching_group" text DEFAULT '' NOT NULL,
	"slides" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"letter" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"heads" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cohorts_programme_slug" ON "cohorts" USING btree ("programme","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_cohort_week" ON "issues" USING btree ("cohort_id","week");--> statement-breakpoint
CREATE INDEX "projects_cohort" ON "projects" USING btree ("cohort_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_one_winner_per_track" ON "projects" USING btree ("track_id") WHERE "projects"."winner" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_cohort_week" ON "sessions" USING btree ("cohort_id","week");--> statement-breakpoint
CREATE INDEX "tracks_cohort" ON "tracks" USING btree ("cohort_id");