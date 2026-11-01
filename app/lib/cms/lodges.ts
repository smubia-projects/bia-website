import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, lodges, type Captain, type LodgeBelt, type LodgeHero, type LodgeRow, type LodgeWeek } from "@/app/lib/db/schema";
import { can, ensure, type Actor } from "./actor";
import { revalidateCms } from "./revalidate";
import {
  LODGE_AMBIENTS,
  LODGE_BELT_MODES,
  LODGE_BELT_SIZES,
  LODGE_BELT_SPEEDS,
  LODGE_EMBLEMS,
  LODGE_HERO_KINDS,
  LODGE_LOGO_STYLES,
  LODGE_NEON_SIGNS,
  LODGE_PARTICLES,
  LODGE_SHOWPIECES,
  LODGE_STATUSES,
  type LodgeAmbient,
  type LodgeEmblem,
  type LodgeLogoStyle,
  type LodgeNeonSign,
  type LodgeStatus,
} from "./taxonomy";

/*
 * AI Lodge lodges. Each semester has its own lodges (copy one forward to reuse it);
 * a past semester's lodges stay as they ran. Everything the AI Lodge site shows
 * about a lodge lives here and is served by /api/public/ailodge.
 */

export type Lodge = LodgeRow;

export async function listLodges(cohortId: string): Promise<Lodge[]> {
  const db = await getDb();
  return db.select().from(lodges).where(eq(lodges.cohortId, cohortId)).orderBy(asc(lodges.position), asc(lodges.id));
}

export async function listAllLodges(): Promise<Lodge[]> {
  const db = await getDb();
  return db.select().from(lodges).orderBy(asc(lodges.position), asc(lodges.id));
}

export async function getLodge(id: number): Promise<Lodge | null> {
  const db = await getDb();
  const [row] = await db.select().from(lodges).where(eq(lodges.id, id));
  return row ?? null;
}

/**
 * Each lodge's path on the AI Lodge site, keyed by lodge id. Lodges live at
 * /lodges/<slug>, past ones included. When a slug comes back in a later semester,
 * the newest lodge keeps /lodges/<slug> and older ones move to
 * /lodges/past/<semester>/<slug>. Hidden semesters don't take a slug from a public one.
 */
export async function lodgePaths(): Promise<Map<number, string>> {
  const db = await getDb();
  const rows = await db
    .select({ id: lodges.id, slug: lodges.slug, semester: cohorts.slug, visibility: cohorts.visibility })
    .from(lodges)
    .innerJoin(cohorts, eq(lodges.cohortId, cohorts.id))
    .orderBy(desc(cohorts.slug), asc(lodges.position));
  const taken = new Set<string>();
  const paths = new Map<number, string>();
  for (const r of rows.filter((x) => x.visibility !== "hidden")) {
    paths.set(r.id, taken.has(r.slug) ? `/lodges/past/${r.semester}/${r.slug}` : `/lodges/${r.slug}`);
    taken.add(r.slug);
  }
  for (const r of rows.filter((x) => x.visibility === "hidden")) paths.set(r.id, `/lodges/${r.slug}`);
  return paths;
}

// ── Writes ───────────────────────────────────────────────────────────────

export interface LodgeInput {
  id?: number;
  cohortId: string;
  name: string;
  slug?: string;
  /** Earlier URL names that should redirect here */
  oldSlugs?: string[];
  placeholder?: boolean;
  motto?: string;
  tagline?: string;
  level?: string;
  whoCanJoin?: string;
  forWho?: string;
  forWhoCard?: string;
  why?: string;
  topics?: string[];
  cardTags?: string[];
  goals?: string[];
  schedule?: string;
  scheduleShort?: string;
  scheduleTentative?: boolean;
  sessionLength?: string;
  weeks?: LodgeWeek[];
  trailTentative?: boolean;
  weeksNote?: string;
  captains?: Captain[];
  status?: LodgeStatus;
  logo?: string;
  logoStyle?: LodgeLogoStyle;
  emblem?: LodgeEmblem;
  accent?: string;
  neonColor?: string;
  ambient?: LodgeAmbient;
  ambientImage?: string;
  ambientGlow?: boolean;
  neonSign?: LodgeNeonSign;
  hero?: LodgeHero;
  belt?: Partial<LodgeBelt>;
}

export const lodgeSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/\blodge\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9-]+$/;
const oneOf = <T extends string>(list: readonly T[], value: unknown, message: string): T => {
  ensure((list as readonly unknown[]).includes(value), message);
  return value as T;
};
const cleanList = (list: string[] | undefined) => (list ?? []).map((s) => s.trim()).filter(Boolean);
const cleanImage = (url: string | undefined, label: string) => {
  const v = (url ?? "").trim();
  ensure(!v || /^https:\/\/\S+$/i.test(v) || v.startsWith("/"), `${label} must be an uploaded image or an https:// link`);
  return v;
};

function cleanCaptains(list: Captain[] | undefined): Captain[] {
  return (list ?? [])
    .map((c) => ({
      name: (c.name ?? "").trim(),
      detail: (c.detail ?? "").trim(),
      telegram: (c.telegram ?? "").trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, ""),
      image: cleanImage(c.image, "A captain photo"),
    }))
    .filter((c) => c.name || c.detail || c.telegram || c.image)
    .map((c) => {
      ensure(c.name, "Every captain needs a name");
      return c;
    });
}

function cleanHero(h: LodgeHero): LodgeHero {
  const kind = oneOf(LODGE_HERO_KINDS, h?.kind, "Unknown header art");
  if (kind === "showpiece") return { kind, showpiece: oneOf(LODGE_SHOWPIECES, h.showpiece, "Pick a showpiece") };
  if (kind === "animated") {
    const image = cleanImage(h.image, "The animated art");
    ensure(image, "Upload the animated SVG, or pick other header art");
    return { kind, image };
  }
  if (kind === "custom") {
    const image = cleanImage(h.image, "The showpiece image");
    ensure(image, "Upload the showpiece image, or pick other header art");
    const glow = (h.glow ?? "").trim();
    ensure(!glow || HEX.test(glow), "The showpiece glow must be a colour like #FFB547, or empty for none");
    return {
      kind,
      image,
      glow: glow.toUpperCase(),
      particles: oneOf(LODGE_PARTICLES, h.particles ?? "none", "Unknown particles"),
      float: h.float !== false,
    };
  }
  return { kind };
}

function cleanBelt(b: Partial<LodgeBelt>, current: LodgeBelt): LodgeBelt {
  const next = { ...current, ...b };
  const belt: LodgeBelt = {
    mode: oneOf(LODGE_BELT_MODES, next.mode, "Unknown strip style"),
    speed: oneOf(LODGE_BELT_SPEEDS, next.speed, "Unknown strip speed"),
    size: oneOf(LODGE_BELT_SIZES, next.size, "Unknown strip size"),
  };
  if (belt.mode === "tile" || belt.mode === "banner") {
    belt.image = cleanImage(next.image, "The strip image");
    ensure(belt.image, belt.mode === "tile" ? "Upload the image to repeat in the strip" : "Upload the long strip image");
  }
  return belt;
}

function cleanWeeks(list: LodgeWeek[] | undefined): LodgeWeek[] {
  return (list ?? [])
    .map((w) => ({
      label: (w.label ?? "").trim(),
      topic: (w.topic ?? "").trim(),
      ...(w.tag === "mandatory" || w.tag === "optional" ? { tag: w.tag } : {}),
      ...(w.note?.trim() ? { note: w.note.trim() } : {}),
    }))
    .filter((w) => w.label || w.topic);
}

/** Validates the editable fields; anything left undefined stays as it is. */
function lodgeValues(input: LodgeInput, currentBelt: LodgeBelt) {
  const v: Partial<typeof lodges.$inferInsert> = { updatedAt: new Date().toISOString() };
  const name = input.name.trim();
  ensure(name, "Lodge name is required");
  v.name = name;
  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase() || lodgeSlug(name);
    ensure(SLUG.test(slug), 'Use a short URL name with letters, numbers and dashes, like "hackstreet-boys"');
    ensure(slug !== "past", '"past" is reserved on the AI Lodge site; pick another URL name');
    v.slug = slug;
  }
  if (input.oldSlugs !== undefined) {
    v.oldSlugs = Array.from(new Set(cleanList(input.oldSlugs).map((s) => s.toLowerCase().replace(/^\/?(lodges\/)?/, ""))));
    for (const old of v.oldSlugs) ensure(SLUG.test(old) && old !== "past", `"${old}" isn't a URL name (letters, numbers and dashes)`);
  }
  if (input.placeholder !== undefined) v.placeholder = Boolean(input.placeholder);
  if (input.trailTentative !== undefined) v.trailTentative = Boolean(input.trailTentative);
  for (const key of ["motto", "tagline", "level", "whoCanJoin", "forWho", "forWhoCard", "why", "schedule", "scheduleShort", "sessionLength", "weeksNote"] as const) {
    if (input[key] !== undefined) v[key] = (input[key] as string).trim();
  }
  for (const key of ["topics", "cardTags", "goals"] as const) {
    if (input[key] !== undefined) v[key] = cleanList(input[key]);
  }
  if (input.scheduleTentative !== undefined) v.scheduleTentative = Boolean(input.scheduleTentative);
  if (input.ambientGlow !== undefined) v.ambientGlow = Boolean(input.ambientGlow);
  if (input.weeks !== undefined) v.weeks = cleanWeeks(input.weeks);
  if (input.captains !== undefined) v.captains = cleanCaptains(input.captains);
  if (input.status !== undefined) {
    ensure((LODGE_STATUSES as readonly string[]).includes(input.status), "Unknown lodge status");
    v.status = input.status;
  }
  if (input.ambient !== undefined) {
    ensure((LODGE_AMBIENTS as readonly string[]).includes(input.ambient), "Unknown ambient style");
    v.ambient = input.ambient;
  }
  if (input.neonSign !== undefined) {
    ensure((LODGE_NEON_SIGNS as readonly string[]).includes(input.neonSign), "Unknown neon sign");
    v.neonSign = input.neonSign;
  }
  if (input.accent !== undefined) {
    ensure(HEX.test(input.accent.trim()), "The accent must be a colour like #7DD7C2");
    v.accent = input.accent.trim().toUpperCase();
  }
  if (input.neonColor !== undefined) {
    const c = input.neonColor.trim();
    ensure(!c || HEX.test(c), "The neon colour must be a colour like #FF1810, or empty to use the accent");
    v.neonColor = c.toUpperCase();
  }
  if (input.logo !== undefined) v.logo = cleanImage(input.logo, "The logo");
  if (input.logoStyle !== undefined) v.logoStyle = oneOf(LODGE_LOGO_STYLES, input.logoStyle, "Unknown logo style");
  if (input.emblem !== undefined) v.emblem = oneOf(LODGE_EMBLEMS, input.emblem, "Unknown stand-in emblem");
  if (input.ambientImage !== undefined) v.ambientImage = cleanImage(input.ambientImage, "The particle image");
  if (input.hero !== undefined) v.hero = cleanHero(input.hero);
  if (input.belt !== undefined) v.belt = cleanBelt(input.belt, currentBelt);
  return v;
}

async function requireSemester(actor: Actor, cohortId: string) {
  const db = await getDb();
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId));
  ensure(cohort, "Semester not found");
  ensure(cohort.programme === "AI Lodge", "Only AI Lodge semesters have lodges");
  ensure(can.editCohort(actor, "AI Lodge"), "You can't edit lodges");
  return cohort;
}

async function ensureSlugFree(cohortId: string, slug: string, exceptId?: number) {
  const db = await getDb();
  const [clash] = await db
    .select({ id: lodges.id, name: lodges.name })
    .from(lodges)
    .where(and(eq(lodges.cohortId, cohortId), eq(lodges.slug, slug), exceptId ? ne(lodges.id, exceptId) : undefined));
  ensure(!clash, `${clash?.name} already uses the URL name "${slug}" this semester`);
}

export async function saveLodge(actor: Actor, input: LodgeInput): Promise<Lodge> {
  await requireSemester(actor, input.cohortId);
  const existing = input.id ? await getLodge(input.id) : null;
  ensure(!input.id || existing, "Lodge not found");
  const values = lodgeValues(
    { ...input, slug: input.slug ?? (input.id ? undefined : "") },
    existing?.belt ?? { mode: "mark", speed: "normal", size: "medium" }
  );
  const hero = values.hero ?? existing?.hero;
  const neonSign = values.neonSign ?? existing?.neonSign ?? "none";
  ensure(hero?.kind !== "neon" || neonSign !== "none", "Pick a neon sign to show it in the header");
  if (values.slug) await ensureSlugFree(input.cohortId, values.slug, input.id);
  const db = await getDb();
  let row: Lodge | undefined;
  if (input.id) {
    [row] = await db
      .update(lodges)
      .set(values)
      .where(and(eq(lodges.id, input.id), eq(lodges.cohortId, input.cohortId)))
      .returning();
    ensure(row, "Lodge not found");
  } else {
    const siblings = await listLodges(input.cohortId);
    [row] = await db
      .insert(lodges)
      .values({ ...values, name: values.name!, slug: values.slug!, cohortId: input.cohortId, position: siblings.length })
      .returning();
  }
  revalidateCms("cohorts", "projects");
  return row!;
}

/** Moves a lodge one place up or down in its semester (the AI Lodge site's order). */
export async function moveLodge(actor: Actor, id: number, direction: "up" | "down") {
  const lodge = await getLodge(id);
  ensure(lodge, "Lodge not found");
  await requireSemester(actor, lodge.cohortId);
  const list = await listLodges(lodge.cohortId);
  const from = list.findIndex((l) => l.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
  const db = await getDb();
  for (let position = 0; position < list.length; position++) {
    if (list[position].position !== position) await db.update(lodges).set({ position }).where(eq(lodges.id, list[position].id));
  }
  revalidateCms("cohorts", "projects");
}

/** Copies a lodge, captains, trail and art included, into another semester. */
export async function copyLodge(actor: Actor, id: number, toCohortId: string): Promise<Lodge> {
  const source = await getLodge(id);
  ensure(source, "Lodge not found");
  await requireSemester(actor, toCohortId);
  ensure(source.cohortId !== toCohortId, "The lodge is already in this semester");
  const taken = new Set((await listLodges(toCohortId)).map((l) => l.slug));
  let slug = source.slug;
  for (let n = 2; taken.has(slug); n++) slug = `${source.slug}-${n}`;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, cohortId: _cohort, position: _position, updatedAt: _updated, ...fields } = source;
  const db = await getDb();
  const [row] = await db
    .insert(lodges)
    .values({ ...fields, slug, cohortId: toCohortId, position: taken.size, updatedAt: new Date().toISOString() })
    .returning();
  revalidateCms("cohorts", "projects");
  return row;
}

/** Projects in a removed lodge keep everything else; only the lodge link goes. */
export async function deleteLodge(actor: Actor, id: number) {
  ensure(can.editCohort(actor, "AI Lodge"), "You can't remove lodges");
  const db = await getDb();
  await db.delete(lodges).where(eq(lodges.id, id));
  revalidateCms("cohorts", "projects");
}
