import "server-only";
import { and, desc, eq, ne } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/server/db";
import { cohorts, sessions, type CohortRow, type TimelineStep } from "@/server/db/schema";
import { ensure, type Actor } from "@/server/core/actor";
import { can } from "@/server/core/permissions";
import { listLodges, lodgePaths, type Lodge } from "@/server/ailodge/lodges";
import { listTracks, type Track } from "@/server/ailodge/tracks";
import { listGroups, type DapGroup } from "@/server/dap/colearning-groups";
import { revalidateCms, TAGS } from "@/server/core/revalidate";
import { COHORT_VISIBILITY, DAP_WEEKS, PROGRAMMES, type CohortVisibility, type Programme } from "@/shared/taxonomy";

export type Cohort = CohortRow;

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
  /** AI Lodge: first day of week 1 (YYYY-MM-DD), or null */
  startsOn?: string | null;
}

export async function createCohort(
  actor: Actor,
  input: { programme: Programme; slug: string; name: string }
): Promise<Cohort> {
  ensure((PROGRAMMES as readonly string[]).includes(input.programme), "Unknown programme");
  ensure(can.editCohort(actor, input.programme), "This role cannot create cohorts");
  const slug = input.slug.trim().toLowerCase();
  ensure(/^[a-z0-9-]+$/.test(slug), 'URL slug must use lower-case letters, numbers and dashes, for example "ay2627-s2"');
  // "new" is the CMS's new-run page (/admin/dap/new).
  ensure(slug !== "new", 'URL slug "new" is reserved. Choose another.');
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
  ensure(can.editCohort(actor, row.programme), "This role cannot edit this programme");
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
  if (input.startsOn !== undefined) {
    const v = input.startsOn?.trim() || null;
    ensure(v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Week 1 start must be a date (YYYY-MM-DD)");
    values.startsOn = v;
  }
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
      ensure(/^\d{4}-\d{2}-\d{2}$/.test(t.date), `Date required for "${t.label}"`);
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
