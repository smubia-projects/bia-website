import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { cohorts, projects, tracks, type TrackRow } from "@/server/db/schema";
import { ensure, type Actor } from "@/server/core/actor";
import { can } from "@/server/core/permissions";
import { revalidateCms } from "@/server/core/revalidate";
import { getCohort } from "@/server/cohorts/cohorts";

/* AI Lodge Hack Day tracks: a semester's yearbook shelves, at most one winner each. */

export type Track = TrackRow & { projectCount: number };

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
  ensure(can.editCohort(actor, cohort.programme), "This role cannot edit tracks");
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
  ensure(can.editCohort(actor, "AI Lodge"), "This role cannot reorder tracks");
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
  ensure(can.editCohort(actor, "AI Lodge"), "This role cannot remove tracks");
  const db = await getDb();
  const [row] = await db.select().from(tracks).where(eq(tracks.id, id));
  ensure(row, "Track not found");
  ensure(Number((await listTracks(row.cohortId)).find((t) => t.id === id)?.projectCount ?? 0) === 0, "Track has projects. Move them to another track first.");
  await db.delete(tracks).where(eq(tracks.id, id));
  revalidateCms("cohorts", "projects");
}
