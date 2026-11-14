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
ALTER TABLE "telegram_link_codes" ADD CONSTRAINT "telegram_link_codes_project_group_id_project_groups_id_fk" FOREIGN KEY ("project_group_id") REFERENCES "public"."project_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_link_codes_hash" ON "telegram_link_codes" USING btree ("code_hash");