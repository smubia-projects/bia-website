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
  LodgeAmbient,
  LodgeBeltMode,
  LodgeBeltSize,
  LodgeBeltSpeed,
  LodgeEmblem,
  LodgeHeroKind,
  LodgeLogoStyle,
  LodgeNeonSign,
  LodgeParticles,
  LodgeShowpiece,
  LodgeStatus,
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

/** One step of a semester's applications timeline, e.g. { label: "Deadline", date: "2026-11-02" }. */
export interface TimelineStep {
  label: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  /** The date applicants must act by; the AI Lodge site emphasises it */
  deadline?: boolean;
}

/** A lodge head, shown on the lodge's page on the AI Lodge site. */
export interface Captain {
  name: string;
  /** School and year, e.g. "SCIS (IS) / Year 2" */
  detail: string;
  /** Telegram handle without the @ */
  telegram: string;
  image: string;
}

/**
 * The art on the right of a lodge page's header. `neon` draws the lodge's neon
 * sign; `showpiece` a coded showpiece; `custom` an uploaded image with an
 * optional glow, particles and float; `animated` an uploaded animated SVG.
 */
export interface LodgeHero {
  kind: LodgeHeroKind;
  showpiece?: LodgeShowpiece;
  /** custom and animated: the uploaded image */
  image?: string;
  /** custom: hex colour of the glow behind the image; empty = no glow */
  glow?: string;
  particles?: LodgeParticles;
  /** custom: gentle float and pointer parallax */
  float?: boolean;
}

/** The strip that scrolls under a lodge page's header. */
export interface LodgeBelt {
  mode: LodgeBeltMode;
  /** tile and banner: the uploaded image (banner: a long seamless strip) */
  image?: string;
  speed: LodgeBeltSpeed;
  size: LodgeBeltSize;
}

/** One stop on a lodge's week-by-week trail. */
export interface LodgeWeek {
  /** "Week 1", "Recess", "Weeks 5–8" */
  label: string;
  topic: string;
  tag?: "mandatory" | "optional";
  note?: string;
}

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
    /** AI Lodge applications timeline shown on the AI Lodge site */
    timeline: jsonb("timeline").$type<TimelineStep[]>().notNull().default([]),
    /** AI Lodge site's name for the intake, e.g. "Fall 2026" (falls back to name) */
    shortName: text("short_name").notNull().default(""),
    /** When lodge details go live, read as "Details drop {revealNote}", e.g. "soon" or "26 Oct" */
    revealNote: text("reveal_note").notNull().default(""),
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
    position: integer("position").notNull().default(0),
    /** URL segment on the AI Lodge site: ailodge.smubia.com/lodges/<slug> */
    slug: text("slug").notNull().default(""),
    /** Earlier URL names that redirect to this lodge, e.g. "kag" */
    oldSlugs: jsonb("old_slugs").$type<string[]>().notNull().default([]),
    /** Details not released yet: the site shows a "details drop" card instead */
    placeholder: boolean("placeholder").notNull().default(false),
    /** Quoted line under the name, e.g. "Mostly Intelligent Together" */
    motto: text("motto").notNull().default(""),
    tagline: text("tagline").notNull().default(""),
    /** Badge, e.g. "Open to all" or "Beginner" */
    level: text("level").notNull().default(""),
    /** "Who can join", e.g. "Anyone" */
    whoCanJoin: text("who_can_join").notNull().default(""),
    forWho: text("for_who").notNull().default(""),
    /** Short "who it's for" on the lodge card; falls back to forWho */
    forWhoCard: text("for_who_card").notNull().default(""),
    why: text("why").notNull().default(""),
    topics: jsonb("topics").$type<string[]>().notNull().default([]),
    /** Card tags; fall back to the first three topics */
    cardTags: jsonb("card_tags").$type<string[]>().notNull().default([]),
    goals: jsonb("goals").$type<string[]>().notNull().default([]),
    /** "Tue or Wed evenings · 7–10pm" */
    schedule: text("schedule").notNull().default(""),
    /** For the lodge card, e.g. "Tue · 7–10pm" */
    scheduleShort: text("schedule_short").notNull().default(""),
    scheduleTentative: boolean("schedule_tentative").notNull().default(true),
    sessionLength: text("session_length").notNull().default(""),
    weeks: jsonb("weeks").$type<LodgeWeek[]>().notNull().default([]),
    /** The weekly topics are a draft; the site says so */
    trailTentative: boolean("trail_tentative").notNull().default(false),
    /** Shown under the trail, e.g. "Weekly topics are indicative and may shift." */
    weeksNote: text("weeks_note").notNull().default(""),
    captains: jsonb("captains").$type<Captain[]>().notNull().default([]),
    /** Whether this lodge takes applications (the AI Lodge switch in Site links also applies) */
    status: text("status").$type<LodgeStatus>().notNull().default("open"),
    // Art: everything the AI Lodge site needs to draw the lodge
    logo: text("logo").notNull().default(""),
    logoStyle: text("logo_style").$type<LodgeLogoStyle>().notNull().default("tint"),
    /** Stand-in emblem while there is no logo */
    emblem: text("emblem").$type<LodgeEmblem>().notNull().default("campfire"),
    accent: text("accent").notNull().default("#7DD7C2"),
    /** Glow colour for the logo and neon sign; empty = accent */
    neonColor: text("neon_color").notNull().default(""),
    ambient: text("ambient").$type<LodgeAmbient>().notNull().default("pointed"),
    /** Custom drifting particle image; replaces the ambient preset when set */
    ambientImage: text("ambient_image").notNull().default(""),
    ambientGlow: boolean("ambient_glow").notNull().default(false),
    /** Coded neon sign on the AI Lodge site: the card mark, belt mark and (optionally) the hero */
    neonSign: text("neon_sign").$type<LodgeNeonSign>().notNull().default("none"),
    hero: jsonb("hero").$type<LodgeHero>().notNull().default({ kind: "logo" }),
    belt: jsonb("belt").$type<LodgeBelt>().notNull().default({ mode: "mark", speed: "normal", size: "medium" }),
    updatedAt: updatedAt(),
  },
  (t) => [index("lodges_cohort").on(t.cohortId), uniqueIndex("lodges_cohort_slug").on(t.cohortId, t.slug)]
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

/**
 * A personal access token for the MCP endpoint. It acts as its owner with their
 * current role (re-read on every call), so removing someone from People ends it
 * too. Only a SHA-256 hash is stored; the token is shown once when created.
 */
export const accessTokens = pgTable(
  "access_tokens",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    /** What it's for, e.g. "Claude Code on my laptop" */
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    /** First characters of the token, to tell tokens apart */
    preview: text("preview").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [uniqueIndex("access_tokens_hash").on(t.tokenHash), index("access_tokens_email").on(t.email)]
);

export type AccessTokenRow = typeof accessTokens.$inferSelect;

/** A person shown on the site: DAP group members and mentors. */
export interface Profile {
  name: string;
  image?: string;
  linkedin?: string;
  email?: string;
  /** @handle or a t.me link */
  telegram?: string;
}

/** A DAP co-learning group: it teaches sessions; 1–3 mentors guide it. Project groups are each project's `team`. */
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

/** A replaced site photo (see app/lib/photos.ts): { src, alt } for one photo, or a list for a gallery. */
export const sitePhotos = pgTable("site_photos", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<{ src: string; alt: string } | { src: string; alt: string }[]>().notNull(),
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
