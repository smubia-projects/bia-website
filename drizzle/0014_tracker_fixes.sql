CREATE TABLE "telegram_link_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"kind" text NOT NULL,
	"email" text,
	"project_group_id" integer,
	"created_by" text DEFAULT '' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_updates" (
	"update_id" bigint PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "telegram_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "telegram_username" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "subtasks" ADD COLUMN "assignee_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_project_group_id_project_groups_id_fk" FOREIGN KEY ("project_group_id") REFERENCES "public"."project_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_link_codes_hash" ON "telegram_link_codes" USING btree ("code_hash");--> statement-breakpoint
ALTER TABLE "project_groups" ADD COLUMN "milestone_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_groups" ADD COLUMN "task_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_groups" ADD COLUMN "blocker_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "number" integer;--> statement-breakpoint
ALTER TABLE "subtasks" ADD COLUMN "number" integer;--> statement-breakpoint
ALTER TABLE "blockers" ADD COLUMN "number" integer;--> statement-breakpoint
UPDATE "milestones" SET "number" = n.number FROM (SELECT "id", row_number() OVER (PARTITION BY "group_id" ORDER BY "id") AS number FROM "milestones") n WHERE "milestones"."id" = n."id";--> statement-breakpoint
UPDATE "subtasks" SET "number" = n.number FROM (SELECT s."id", row_number() OVER (PARTITION BY m."group_id" ORDER BY s."id") AS number FROM "subtasks" s JOIN "milestones" m ON m."id" = s."milestone_id") n WHERE "subtasks"."id" = n."id";--> statement-breakpoint
UPDATE "blockers" SET "number" = n.number FROM (SELECT b."id", row_number() OVER (PARTITION BY m."group_id" ORDER BY b."id") AS number FROM "blockers" b JOIN "milestones" m ON m."id" = b."milestone_id") n WHERE "blockers"."id" = n."id";--> statement-breakpoint
UPDATE "project_groups" g SET
  "milestone_seq" = COALESCE((SELECT max(m."number") FROM "milestones" m WHERE m."group_id" = g."id"), 0),
  "task_seq" = COALESCE((SELECT max(s."number") FROM "subtasks" s JOIN "milestones" m ON m."id" = s."milestone_id" WHERE m."group_id" = g."id"), 0),
  "blocker_seq" = COALESCE((SELECT max(b."number") FROM "blockers" b JOIN "milestones" m ON m."id" = b."milestone_id" WHERE m."group_id" = g."id"), 0);--> statement-breakpoint
ALTER TABLE "milestones" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subtasks" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "blockers" ALTER COLUMN "number" SET NOT NULL;
