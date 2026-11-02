import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import {
  cohorts,
  dapGroups,
  projects,
  sessions,
  tracks,
  type CohortRow,
  type DapGroupRow,
  type Profile,
  type TimelineStep,
  type TrackRow,
} from "@/app/lib/db/schema";
import { can, ensure, type Actor } from "./actor";
import { listLodges, lodgePaths } from "./lodges";
import { revalidateCms, TAGS } from "./revalidate";
import { COHORT_VISIBILITY, DAP_WEEKS, PROGRAMMES, type CohortVisibility, type Programme } from "./taxonomy";

export type Cohort = CohortRow;
export type Track = TrackRow & { projectCount: number };
import type { Lodge } from "./lodges";
export type { Lodge };
export type DapGroup = DapGroupRow;

export const cohortIdFor = (programme: Programme, slug: string) =>
  `${programme === "AI Lodge" ? "ai-lodge" : "dap"}-${slug}`;

/** Newest first: slugs are "ay2627-s1" style, so they sort chronologically. */
export async function listCohorts(programme?: Programme): Promise<Cohort[]> {
  const db = await getDb();
  const q = db.select().from(cohorts);
  return (programme ? q.where(eq(cohorts.programme, programme)) : q).orderBy(desc(cohorts.slug));
}

export async function getCohort(id: string): Promise<Cohort | null> {
  const db = await getDb();
  const [row] = await db.select().from(cohorts).where(eq(cohorts.id, id));
  return row ?? null;
}

export async function listTracks(cohortId: string): Promise<Track[]> {
  const db = await getDb();
  const rows = await db
    .select({
      t: tracks,
      projectCount: sql<number>`(select count(*) from ${projects} where ${projects.trackId} = ${tracks.id})`,
    })
    .from(tracks)
    .where(eq(tracks.cohortId, cohortId))
    .orderBy(asc(tracks.position), asc(tracks.id));
  return rows.map((r) => ({ ...r.t, projectCount: Number(r.projectCount) }));
}

export async function listAllTracks(): Promise<(TrackRow & { cohortName: string })[]> {
  const db = await getDb();
  const rows = await db
    .select({ t: tracks, cohortName: cohorts.name })
    .from(tracks)
    .innerJoin(cohorts, eq(tracks.cohortId, cohorts.id))
    .orderBy(desc(cohorts.slug), asc(tracks.position));
  return rows.map((r) => ({ ...r.t, cohortName: r.cohortName }));
}

// ── Public (cached) ──────────────────────────────────────────────────────

export interface PublicCohort extends Cohort {
  tracks: Track[];
  /** With each lodge's path on the AI Lodge site, e.g. /lodges/mit */
  lodges: (Lodge & { path: string })[];
  groups: DapGroup[];
}

const readPublicCohorts = unstable_cache(
  async (programme: Programme): Promise<PublicCohort[]> => {
    const all = (await listCohorts(programme)).filter((c) => c.visibility !== "hidden");
    const paths = await lodgePaths();
    return Promise.all(
      all.map(async (c) => {
        const [t, l, g] = await Promise.all([listTracks(c.id), listLodges(c.id), listGroups(c.id)]);
        return { ...c, tracks: t, lodges: l.map((x) => ({ ...x, path: paths.get(x.id) ?? `/lodges/${x.slug}` })), groups: g };
      })
    );
  },
  ["cms-public-cohorts"],
  { revalidate: 3600, tags: [TAGS.cohorts, TAGS.projects] }
);

/** Visible cohorts of a programme, newest first, with their tracks. */
export async function getPublicCohorts(programme: Programme): Promise<PublicCohort[]> {
  try {
    return await readPublicCohorts(programme);
  } catch (error) {
    console.error("[cms] public cohort read failed", error);
    return [];
  }
}

/** The live cohort, or the newest archived one when none is live. */
export function pickCurrentCohort<T extends Cohort>(list: T[]): T | null {
  return list.find((c) => c.visibility === "live") ?? list[0] ?? null;
}

// ── Mutations ────────────────────────────────────────────────────────────

export interface CohortInput {
  name?: string;
  /** AI Lodge applications timeline */
  timeline?: TimelineStep[];
  visibility?: CohortVisibility;
  headline?: string;
  writeup?: string;
  hackDay?: string;
  /** AI Lodge site's name for the intake, e.g. "Fall 2026" */
  shortName?: string;
  /** "Details drop {revealNote}" on the AI Lodge site, e.g. "soon" or "26 Oct" */
  revealNote?: string;
}

export async function createCohort(
  actor: Actor,
  input: { programme: Programme; slug: string; name: string }
): Promise<Cohort> {
  ensure((PROGRAMMES as readonly string[]).includes(input.programme), "Unknown programme");
  ensure(can.editCohort(actor, input.programme), "You can't add cohorts");
  const slug = input.slug.trim().toLowerCase();
  ensure(/^[a-z0-9-]+$/.test(slug), 'Use a short URL name like "ay2627-s2"');
  // "new" is the CMS's new-run page (/admin/dap/new).
  ensure(slug !== "new", '"new" is reserved; pick another URL name');
  const name = input.name.trim();
  ensure(name, "Name is required");
  const db = await getDb();
  const id = cohortIdFor(input.programme, slug);
  ensure(!(await getCohort(id)), "That cohort already exists");
  await db.insert(cohorts).values({ id, programme: input.programme, slug, name });
  if (input.programme === "DAP") {
    // DAP cohorts start with a blank co-learning schedule.
    await db
      .insert(sessions)
      .values(Array.from({ length: DAP_WEEKS }, (_, i) => ({ cohortId: id, week: i + 1 })));
  }
  revalidateCms("cohorts");
  return (await getCohort(id))!;
}

export async function updateCohort(actor: Actor, id: string, input: CohortInput): Promise<Cohort> {
  const db = await getDb();
  const row = await getCohort(id);
  ensure(row, "Cohort not found");
  ensure(can.editCohort(actor, row.programme), "Only exco can edit this page");
  if (input.visibility) {
    ensure((COHORT_VISIBILITY as readonly string[]).includes(input.visibility), "Unknown visibility");
  }
  const values: Partial<typeof cohorts.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (input.name !== undefined) {
    values.name = input.name.trim();
    ensure(values.name, "Name is required");
  }
  for (const key of ["visibility", "headline", "writeup", "hackDay"] as const) {
    if (input[key] !== undefined) (values as Record<string, unknown>)[key] = input[key];
  }
  if (input.shortName !== undefined) values.shortName = input.shortName.trim();
  if (input.revealNote !== undefined) values.revealNote = input.revealNote.trim();
  if (input.timeline !== undefined) {
    values.timeline = input.timeline
      .map((t) => ({
        label: (t.label ?? "").trim(),
        date: (t.date ?? "").trim(),
        ...(t.note?.trim() ? { note: t.note.trim() } : {}),
        ...(t.deadline ? { deadline: true } : {}),
      }))
      .filter((t) => t.label || t.date);
    for (const t of values.timeline) {
      ensure(t.label, "Every timeline step needs a label");
      ensure(/^\d{4}-\d{2}-\d{2}$/.test(t.date), `Pick a date for "${t.label}"`);
    }
  }
  if (input.visibility === "live") {
    // Only one live cohort per programme: the previous one is archived.
    await db
      .update(cohorts)
      .set({ visibility: "archived" })
      .where(and(eq(cohorts.programme, row.programme), eq(cohorts.visibility, "live"), ne(cohorts.id, id)));
  }
  await db.update(cohorts).set(values).where(eq(cohorts.id, id));
  revalidateCms("cohorts", "newsletter");
  return (await getCohort(id))!;
}

export interface TrackInput {
  id?: number;
  cohortId: string;
  letter?: string;
  name: string;
}

export async function saveTrack(actor: Actor, input: TrackInput): Promise<TrackRow> {
  const cohort = await getCohort(input.cohortId);
  ensure(cohort, "Cohort not found");
  ensure(cohort.programme === "AI Lodge", "Only AI Lodge semesters have tracks");
  ensure(can.editCohort(actor, cohort.programme), "Only exco can edit tracks");
  const name = input.name.trim();
  ensure(name, "Track name is required");
  const db = await getDb();
  if (input.id) {
    const [row] = await db
      .update(tracks)
      .set({ name, letter: (input.letter ?? "").trim() })
      .where(and(eq(tracks.id, input.id), eq(tracks.cohortId, input.cohortId)))
      .returning();
    ensure(row, "Track not found");
    revalidateCms("cohorts", "projects");
    return row;
  }
  const existing = await listTracks(input.cohortId);
  const letter = (input.letter ?? "").trim() || String.fromCharCode(65 + existing.length);
  const [row] = await db
    .insert(tracks)
    .values({ cohortId: input.cohortId, name, letter, position: existing.length })
    .returning();
  revalidateCms("cohorts", "projects");
  return row;
}

/** Moves a track one place up or down; positions are renumbered 0..n-1 as it goes. */
export async function moveTrack(actor: Actor, id: number, direction: "up" | "down") {
  ensure(can.editCohort(actor, "AI Lodge"), "You can't reorder tracks");
  const db = await getDb();
  const [row] = await db.select().from(tracks).where(eq(tracks.id, id));
  ensure(row, "Track not found");
  const list = await listTracks(row.cohortId);
  const from = list.findIndex((t) => t.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
  await Promise.all(
    list.flatMap((t, position) => (t.position === position ? [] : [db.update(tracks).set({ position }).where(eq(tracks.id, t.id))]))
  );
  revalidateCms("cohorts", "projects");
}

export async function deleteTrack(actor: Actor, id: number) {
  ensure(can.editCohort(actor, "AI Lodge"), "You can't remove tracks");
  const db = await getDb();
  const [row] = await db.select().from(tracks).where(eq(tracks.id, id));
  ensure(row, "Track not found");
  ensure(Number((await listTracks(row.cohortId)).find((t) => t.id === id)?.projectCount ?? 0) === 0, "Move this track's projects to another track first");
  await db.delete(tracks).where(eq(tracks.id, id));
  revalidateCms("cohorts", "projects");
}

// ── Lodges (AI Lodge): see ./lodges ─────────────────────────────────────

export { listAllLodges, listLodges } from "./lodges";

// ── DAP groups ───────────────────────────────────────────────────────────

export async function listGroups(cohortId: string): Promise<DapGroup[]> {
  const db = await getDb();
  return db.select().from(dapGroups).where(eq(dapGroups.cohortId, cohortId)).orderBy(asc(dapGroups.position), asc(dapGroups.id));
}

export interface GroupInput {
  id?: number;
  cohortId: string;
  name: string;
  members?: Profile[];
  mentors?: Profile[];
}

function cleanProfiles(list: Profile[] | undefined, label: string): Profile[] {
  return (list ?? [])
    .map((p) => ({
      name: (p.name ?? "").trim(),
      image: (p.image ?? "").trim() || undefined,
      linkedin: (p.linkedin ?? "").trim() || undefined,
      email: (p.email ?? "").trim() || undefined,
      telegram: (p.telegram ?? "").trim() || undefined,
    }))
    .filter((p) => p.name || p.image || p.linkedin || p.email || p.telegram)
    .map((p) => {
      ensure(p.name, `Every ${label} needs a name`);
      ensure(!p.linkedin || /^https:\/\/\S+$/i.test(p.linkedin), `${p.name}'s LinkedIn must be a full https:// link`);
      ensure(!p.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email), `${p.name}'s email doesn't look right`);
      return p;
    });
}

export async function saveGroup(actor: Actor, input: GroupInput): Promise<DapGroup> {
  const cohort = await getCohort(input.cohortId);
  ensure(cohort, "Cohort not found");
  ensure(cohort.programme === "DAP", "Only DAP cohorts have groups");
  ensure(can.editCohort(actor, "DAP"), "You can't edit DAP groups");
  const name = input.name.trim();
  ensure(name, "Group name is required");
  const values = {
    name,
    ...(input.members !== undefined ? { members: cleanProfiles(input.members, "member") } : {}),
    ...(input.mentors !== undefined ? { mentors: cleanProfiles(input.mentors, "mentor") } : {}),
  };
  const db = await getDb();
  let row: DapGroup | undefined;
  if (input.id) {
    [row] = await db
      .update(dapGroups)
      .set(values)
      .where(and(eq(dapGroups.id, input.id), eq(dapGroups.cohortId, input.cohortId)))
      .returning();
    ensure(row, "Group not found");
  } else {
    const existing = await listGroups(input.cohortId);
    ensure(!existing.some((g) => g.name.toLowerCase() === name.toLowerCase()), `There is already a group called ${name}`);
    [row] = await db.insert(dapGroups).values({ cohortId: input.cohortId, position: existing.length, ...values }).returning();
  }
  revalidateCms("cohorts", "newsletter");
  return row!;
}

/** Sessions taught by a removed group just lose the link. */
export async function deleteGroup(actor: Actor, id: number) {
  ensure(can.editCohort(actor, "DAP"), "You can't edit DAP groups");
  const db = await getDb();
  await db.delete(dapGroups).where(eq(dapGroups.id, id));
  revalidateCms("cohorts", "newsletter");
}
