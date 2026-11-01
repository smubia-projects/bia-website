ALTER TABLE "cohorts" ADD COLUMN "short_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "reveal_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "old_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "placeholder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "trail_tentative" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "logo_style" text DEFAULT 'tint' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "emblem" text DEFAULT 'campfire' NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "hero" jsonb DEFAULT '{"kind":"logo"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lodges" ADD COLUMN "belt" jsonb DEFAULT '{"mode":"mark","speed":"normal","size":"medium"}'::jsonb NOT NULL;--> statement-breakpoint
-- Existing art: a lodge with a neon sign shows it as its hero; animated art becomes an animated hero.
UPDATE "lodges" SET "hero" = '{"kind":"neon"}'::jsonb WHERE "neon_sign" <> 'none';--> statement-breakpoint
UPDATE "lodges" SET "hero" = jsonb_build_object('kind', 'animated', 'image', "animated_art") WHERE "animated_art" <> '';
