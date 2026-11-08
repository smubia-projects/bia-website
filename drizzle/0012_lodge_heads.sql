ALTER TABLE "cohorts" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "lodge_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "people" ADD COLUMN "access_ends" date;