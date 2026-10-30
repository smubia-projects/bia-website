CREATE TABLE "dap_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"members" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mentors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lodges" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"name" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_track_id_tracks_id_fk";
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lodge_id" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "dap_groups" ADD CONSTRAINT "dap_groups_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lodges" ADD CONSTRAINT "lodges_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dap_groups_cohort" ON "dap_groups" USING btree ("cohort_id");--> statement-breakpoint
CREATE INDEX "lodges_cohort" ON "lodges" USING btree ("cohort_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lodge_id_lodges_id_fk" FOREIGN KEY ("lodge_id") REFERENCES "public"."lodges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_group_id_dap_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."dap_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "track_id";--> statement-breakpoint
ALTER TABLE "tracks" DROP COLUMN "heads";--> statement-breakpoint
-- The lodge head role is retired: their logins go.
DELETE FROM "people" WHERE "role" = 'lodge_head';--> statement-breakpoint
-- Turn each cohort's free-text session groups ("Group 1") into real DAP groups.
INSERT INTO "dap_groups" ("cohort_id", "name", "position")
SELECT "cohort_id", "teaching_group", (row_number() OVER (PARTITION BY "cohort_id" ORDER BY "teaching_group")) - 1
FROM (SELECT DISTINCT "cohort_id", "teaching_group" FROM "sessions" WHERE "teaching_group" <> '') g;--> statement-breakpoint
UPDATE "sessions" s SET "group_id" = g."id"
FROM "dap_groups" g
WHERE g."cohort_id" = s."cohort_id" AND g."name" = s."teaching_group";
