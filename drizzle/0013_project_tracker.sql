CREATE TABLE "blockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"milestone_id" integer NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"starts_on" date,
	"due_on" date NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_id" text NOT NULL,
	"number" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"mentors" text DEFAULT '' NOT NULL,
	"telegram_chat_id" bigint,
	"last_meeting_at" timestamp with time zone,
	"meeting_reminders_on" boolean DEFAULT true NOT NULL,
	"meeting_reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_groups_telegram_chat_id_unique" UNIQUE("telegram_chat_id")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"milestone_id" integer NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"due_on" date,
	"assignee_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "telegram_user_id" bigint;--> statement-breakpoint
ALTER TABLE "blockers" ADD CONSTRAINT "blockers_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_group_id_project_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."project_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_groups" ADD CONSTRAINT "project_groups_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_group_id_project_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."project_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_milestone_id_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_assignee_id_project_members_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."project_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blockers_milestone" ON "blockers" USING btree ("milestone_id");--> statement-breakpoint
CREATE INDEX "milestones_group" ON "milestones" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_groups_cohort_number" ON "project_groups" USING btree ("cohort_id","number");--> statement-breakpoint
CREATE INDEX "project_members_group" ON "project_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "subtasks_milestone" ON "subtasks" USING btree ("milestone_id");--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_telegram_user_id_unique" UNIQUE("telegram_user_id");