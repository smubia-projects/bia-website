import { unstable_cache } from "next/cache";
import type { TimelineStep } from "@/app/lib/db/schema";
import { joinLink } from "@/app/lib/links";
import { listCohorts, type Cohort } from "./cohorts";
import { getSiteLinks } from "./links";
import { getSitePhotos } from "./photos";
import { listLodges, lodgePaths, type Lodge } from "./lodges";
import { cohortPath, yearbookPath } from "./paths";
import { TAGS } from "./revalidate";
import { SITE_URL } from "./telegram";
import type { LodgeAmbient, LodgeNeonSign } from "./taxonomy";

/*
 * The public, read-only feed the AI Lodge site (ailodge.smubia.com) builds its
 * pages from: GET /api/public/ailodge. Field names are a contract with that site;
 * add fields freely, but bump FEED_VERSION before renaming or removing one.
 * docs/ailodge-site-handoff.md documents it for the AI Lodge site.
 */

export const FEED_VERSION = 1;

export interface FeedCaptain {
  name: string;
  detail: string;
  telegram: string;
  telegramUrl: string | null;
  image: string | null;
}

export interface FeedLodge {
  slug: string;
  /** Path on the AI Lodge site, e.g. /lodges/mit (see lodgePaths) */
  path: string;
  name: string;
  motto: string | null;
  tagline: string;
  level: string;
  whoCanJoin: string | null;
  forWho: string;
  /** Short version for the card; already falls back to forWho */
  forWhoCard: string;
  why: string;
  topics: string[];
  /** Up to three; already falls back to the first three topics */
  cardTags: string[];
  goals: string[];
  schedule: { text: string | null; short: string | null; tentative: boolean };
  sessionLength: string | null;
  weeks: { label: string; topic: string; tag: "mandatory" | "optional" | null; note: string | null }[];
  weeksNote: string | null;
  captains: FeedCaptain[];
  applications: {
    /** "open" only when the lodge, its semester and the AI Lodge switch are all open */
    status: "open" | "closed";
    /** Where "Apply"/"Join us now" goes for this lodge; null when closed */
    applyUrl: string | null;
  };
  art: {
    logo: string | null;
    accent: string;
    /** Already falls back to accent */
    neonColor: string;
    ambient: LodgeAmbient;
    ambientImage: string | null;
    ambientGlow: boolean;
    neonSign: LodgeNeonSign;
    animatedArt: string | null;
  };
}

export interface FeedSemester {
  slug: string;
  name: string;
  status: "current" | "past";
  hackDay: string | null;
  timeline: TimelineStep[];
  /** The semester's yearbook on smubia.com */
  projectsUrl: string;
  lodges: FeedLodge[];
}

export interface AILodgeFeed {
  version: number;
  generatedAt: string;
  applications: {
    /** The AI Lodge applications switch (CMS › Site links) */
    open: boolean;
    /** Where the site-wide "Apply now" / "Join us now" buttons go: the form when open, the club Telegram when closed */
    url: string;
    formUrl: string;
    telegramUrl: string;
  };
  links: { site: string; smubia: string; projects: string; telegram: string };
  /** The current semester (or the one asked for with ?semester=) */
  semester: FeedSemester | null;
  /** Past semesters, newest first, with their lodges as they ran */
  past: FeedSemester[];
  /**
   * Photos replaced in the CMS (Settings › Photos). null = not replaced: keep the
   * site's own file. Images are absolute URLs.
   */
  photos: {
    entry: { src: string; alt: string } | null;
    entryPortrait: { src: string; alt: string } | null;
    lodgeHero: { src: string; alt: string } | null;
    moments: { src: string; alt: string }[] | null;
  };
}

const abs = (url: string) => (!url ? null : url.startsWith("/") ? `${SITE_URL}${url}` : url);
const orNull = (s: string) => s.trim() || null;

function feedLodge(l: Lodge, path: string, applyUrl: string | null): FeedLodge {
  const open = l.status === "open" && applyUrl !== null;
  return {
    slug: l.slug,
    path,
    name: l.name,
    motto: orNull(l.motto),
    tagline: l.tagline,
    level: l.level,
    whoCanJoin: orNull(l.whoCanJoin),
    forWho: l.forWho,
    forWhoCard: l.forWhoCard || l.forWho,
    why: l.why,
    topics: l.topics,
    cardTags: (l.cardTags.length ? l.cardTags : l.topics).slice(0, 3),
    goals: l.goals,
    schedule: { text: orNull(l.schedule), short: orNull(l.scheduleShort), tentative: l.scheduleTentative },
    sessionLength: orNull(l.sessionLength),
    weeks: l.weeks.map((w) => ({ label: w.label, topic: w.topic, tag: w.tag ?? null, note: w.note ?? null })),
    weeksNote: orNull(l.weeksNote),
    captains: l.captains.map((c) => ({
      name: c.name,
      detail: c.detail,
      telegram: c.telegram,
      telegramUrl: c.telegram ? `https://t.me/${c.telegram}` : null,
      image: abs(c.image),
    })),
    applications: { status: open ? "open" : "closed", applyUrl: open ? applyUrl : null },
    art: {
      logo: abs(l.logo),
      accent: l.accent,
      neonColor: l.neonColor || l.accent,
      ambient: l.ambient,
      ambientImage: abs(l.ambientImage),
      ambientGlow: l.ambientGlow,
      neonSign: l.neonSign,
      animatedArt: abs(l.animatedArt),
    },
  };
}

const readFeedData = unstable_cache(
  async () => {
    const semesters = (await listCohorts("AI Lodge")).filter((c) => c.visibility !== "hidden");
    const paths = Object.fromEntries(await lodgePaths());
    const lodges = Object.fromEntries(await Promise.all(semesters.map(async (c) => [c.id, await listLodges(c.id)] as const)));
    return { semesters, lodges, paths: paths as Record<number, string> };
  },
  ["cms-ailodge-feed"],
  { revalidate: 3600, tags: [TAGS.cohorts] }
);

/** The feed; `semesterSlug` picks which semester is returned as `semester`. */
export async function getAILodgeFeed(semesterSlug?: string): Promise<AILodgeFeed> {
  const [{ semesters, lodges, paths }, links, sitePhotos] = await Promise.all([readFeedData(), getSiteLinks(), getSitePhotos()]);
  const replaced = (key: string) => sitePhotos.custom.includes(`ailodge.${key}`);
  const photo = (key: string) => {
    const p = sitePhotos.single[`ailodge.${key}`];
    return replaced(key) && p ? { src: abs(p.src)!, alt: p.alt } : null;
  };
  const join = joinLink(links, "AI Lodge");
  const live = semesters.find((c) => c.visibility === "live") ?? semesters[0] ?? null;
  const chosen = semesterSlug ? semesters.find((c) => c.slug === semesterSlug) ?? null : live;

  const toSemester = (c: Cohort): FeedSemester => {
    const current = c.id === live?.id;
    // Only the current semester's lodges can take applications.
    const applyUrl = current && join.open ? join.href : null;
    return {
      slug: c.slug,
      name: c.name,
      status: current ? "current" : "past",
      hackDay: orNull(c.hackDay),
      timeline: c.timeline,
      projectsUrl: `${SITE_URL}${cohortPath("AI Lodge", c.slug)}`,
      lodges: (lodges[c.id] ?? []).map((l) => feedLodge(l, paths[l.id] ?? `/lodges/${l.slug}`, applyUrl)),
    };
  };

  return {
    version: FEED_VERSION,
    generatedAt: new Date().toISOString(),
    applications: { open: join.open, url: join.href, formUrl: links.aiLodgeSignup, telegramUrl: links.telegram },
    links: {
      site: links.aiLodgeInfosite,
      smubia: SITE_URL,
      projects: `${SITE_URL}${yearbookPath("AI Lodge")}`,
      telegram: links.telegram,
    },
    semester: chosen ? toSemester(chosen) : null,
    past: semesters.filter((c) => c.id !== live?.id && c.visibility === "archived").map(toSemester),
    photos: {
      entry: photo("entry"),
      entryPortrait: photo("entryPortrait"),
      lodgeHero: photo("lodgeHero"),
      moments: replaced("moments") ? (sitePhotos.gallery["ailodge.moments"] ?? []).map((p) => ({ src: abs(p.src)!, alt: p.alt })) : null,
    },
  };
}
