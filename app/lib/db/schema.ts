import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  BlockType,
  CohortVisibility,
  IssueStatus,
  Programme,
  ProjectStatus,
  Role,
} from "@/app/lib/cms/taxonomy";
import type { HighlightCard, TeamMember } from "@/app/projects/data/types";

// Timestamps use string mode so rows survive unstable_cache (JSON) unchanged.
const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

/** A programme intake: an AI Lodge semester or a DAP cohort. */
export const cohorts = pgTable(
  "cohorts",
  {
    id: text("id").primaryKey(),
    programme: text("programme").$type<Programme>().notNull(),
    /** URL segment, e.g. "ay2627-s1" (AI Lodge) or "ay2627" (DAP) */
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    visibility: text("visibility").$type<CohortVisibility>().notNull().default("hidden"),
    headline: text("headline").notNull().default(""),
    /** Markdown */
    writeup: text("writeup").notNull().default(""),
    /** "Date · Venue" (AI Lodge only) */
    hackDay: text("hack_day").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("cohorts_programme_slug").on(t.programme, t.slug)]
);

/**
 * A Hack Day track inside one AI Lodge semester; each becomes a yearbook shelf and
 * has at most one winner. Separate from lodges, which are who taught the team.
 */
export const tracks = pgTable(
  "tracks",
  {
    id: serial("id").primaryKey(),
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    letter: text("letter").notNull().default(""),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("tracks_cohort").on(t.cohortId)]
);

/**
 * An AI Lodge lodge in one semester (a themed group run by lodge heads). Lodge
 * pages and head profiles live on ailodge.smubia.com; this only links there.
 */
export const lodges = pgTable(
  "lodges",
  {
    id: serial("id").primaryKey(),
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The lodge's page on the AI Lodge site */
    url: text("url").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("lodges_cohort").on(t.cohortId)]
);

export const projects = pgTable(
  "projects",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    programme: text("programme").$type<Programme>().notNull(),
    cohortId: text("cohort_id").references(() => cohorts.id, { onDelete: "set null" }),
    /** Hack Day track it entered (AI Lodge) */
    trackId: integer("track_id").references(() => tracks.id, { onDelete: "set null" }),
    /** Lodge its team was in (AI Lodge) */
    lodgeId: integer("lodge_id").references(() => lodges.id, { onDelete: "set null" }),
    madeFor: text("made_for").notNull().default(""),
    builtWith: text("built_with").notNull().default(""),
    /** Legacy free-text category from the Redis era; not edited any more */
    category: text("category").notNull().default(""),
    coverImage: text("cover_image").notNull().default(""),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    /** Markdown write-up */
    overview: text("overview").notNull().default(""),
    cards: jsonb("cards").$type<HighlightCard[]>().notNull().default([]),
    team: jsonb("team").$type<TeamMember[]>().notNull().default([]),
    techStack: jsonb("tech_stack").$type<string[]>().notNull().default([]),
    demoUrl: text("demo_url").notNull().default(""),
    sourceUrl: text("source_url").notNull().default(""),
    liveUrl: text("live_url").notNull().default(""),
    status: text("status").$type<ProjectStatus>().notNull().default("draft"),
    winner: boolean("winner").notNull().default(false),
    /** Stable fallback order (the Redis index order at import) */
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (t) => [
    index("projects_cohort").on(t.cohortId),
    // Every track has at most one winner.
    uniqueIndex("projects_one_winner_per_track")
      .on(t.trackId)
      .where(sql`${t.winner} = true`),
  ]
);

/** CMS access list. Signing in requires a row here (or a bootstrap admin email). */
export const people = pgTable("people", {
  email: text("email").primaryKey(),
  name: text("name").notNull().default(""),
  role: text("role").$type<Role>().notNull(),
  createdAt: createdAt(),
});

/** A person shown on the site: DAP group members and mentors. */
export interface Profile {
  name: string;
  image?: string;
  linkedin?: string;
  email?: string;
  /** @handle or a t.me link */
  telegram?: string;
}

/** A DAP teaching group: it teaches co-learning sessions; 1–3 mentors guide it. */
export const dapGroups = pgTable(
  "dap_groups",
  {
    id: serial("id").primaryKey(),
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    members: jsonb("members").$type<Profile[]>().notNull().default([]),
    mentors: jsonb("mentors").$type<Profile[]>().notNull().default([]),
  },
  (t) => [index("dap_groups_cohort").on(t.cohortId)]
);

/** DAP co-learning schedule: one row per week of a DAP cohort. */
export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    topic: text("topic").notNull().default(""),
    /** The DAP group teaching that week */
    groupId: integer("group_id").references(() => dapGroups.id, { onDelete: "set null" }),
    slides: text("slides").notNull().default(""),
  },
  (t) => [uniqueIndex("sessions_cohort_week").on(t.cohortId, t.week)]
);

export interface IssueBlock {
  id: string;
  type: BlockType;
  heading: string;
  /** Markdown body (caption for Image blocks) */
  body: string;
  /** Image blocks only */
  image?: string;
}

/** "This week in DAP" newsletter issues: one per week of a DAP cohort. */
export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    cohortId: text("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    week: integer("week").notNull(),
    title: text("title").notNull().default(""),
    summary: text("summary").notNull().default(""),
    coverImage: text("cover_image").notNull().default(""),
    blocks: jsonb("blocks").$type<IssueBlock[]>().notNull().default([]),
    status: text("status").$type<IssueStatus>().notNull().default("draft"),
    /** When a scheduled issue goes out (the daily cron publishes it) */
    publishAt: timestamp("publish_at", { withTimezone: true, mode: "string" }),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "string" }),
    postToTelegram: boolean("post_to_telegram").notNull().default(true),
    telegramPostedAt: timestamp("telegram_posted_at", { withTimezone: true, mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: text("updated_by").notNull().default(""),
  },
  (t) => [uniqueIndex("issues_cohort_week").on(t.cohortId, t.week)]
);

/** Club links editable in the CMS (join forms, socials). Unset keys fall back to app/lib/links.ts. */
export const siteLinks = pgTable("site_links", {
  key: text("key").primaryKey(),
  url: text("url").notNull(),
  updatedAt: updatedAt(),
  updatedBy: text("updated_by").notNull().default(""),
});

/** Site-wide switches edited in the CMS, e.g. { key: "applications", value: { dap: true, aiLodge: false } }. */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
  updatedBy: text("updated_by").notNull().default(""),
});

export type CohortRow = typeof cohorts.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type LodgeRow = typeof lodges.$inferSelect;
export type DapGroupRow = typeof dapGroups.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type PersonRow = typeof people.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type IssueRow = typeof issues.$inferSelect;
