ALTER TABLE "cohorts" ADD COLUMN "timeline" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "slug" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "motto" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "tagline" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "level" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "who_can_join" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "for_who" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "for_who_card" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "why" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "topics" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "card_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "goals" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "schedule" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "schedule_short" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "schedule_tentative" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "session_length" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "weeks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "weeks_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "captains" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "logo" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "accent" text DEFAULT '#7DD7C2' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "neon_color" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "ambient" text DEFAULT 'pointed' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "ambient_image" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "ambient_glow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "neon_sign" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "animated_art" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Existing lodges get a slug from their AI Lodge site link, else from their name.
UPDATE "lodges" SET "slug" = COALESCE(
  substring("url" from '/lodges/([a-z0-9-]+)'),
  NULLIF(trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')), ''),
  'lodge-' || "id"
);--> statement-breakpoint
UPDATE "lodges" l SET "slug" = l."slug" || '-' || l."id"
WHERE EXISTS (SELECT 1 FROM "lodges" o WHERE o."cohort_id" = l."cohort_id" AND o."slug" = l."slug" AND o."id" < l."id");--> statement-breakpoint
CREATE UNIQUE INDEX "lodges_cohort_slug" ON "lodges" USING btree ("cohort_id","slug");