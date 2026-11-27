import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { dapGroups, type DapGroupRow, type Profile } from "@/server/db/schema";
import { ensure, type Actor } from "@/server/core/actor";
import { can } from "@/server/core/permissions";
import { revalidateCms } from "@/server/core/revalidate";
import { getCohort } from "@/server/cohorts/cohorts";

/*
 * DAP co-learning groups: the groups that teach the weekly sessions, with members and 1-3 mentors.
 * Not the tracker's project groups (src/server/dap/tracker).
 */

export type DapGroup = DapGroupRow;

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
      ensure(!p.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email), `${p.name}: invalid email address`);
      return p;
    });
}

export async function saveGroup(actor: Actor, input: GroupInput): Promise<DapGroup> {
  const cohort = await getCohort(input.cohortId);
  ensure(cohort, "Cohort not found");
  ensure(cohort.programme === "DAP", "Only DAP cohorts have groups");
  ensure(can.editCohort(actor, "DAP"), "This role cannot edit DAP groups");
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
    ensure(!existing.some((g) => g.name.toLowerCase() === name.toLowerCase()), `A group named ${name} already exists`);
    [row] = await db.insert(dapGroups).values({ cohortId: input.cohortId, position: existing.length, ...values }).returning();
  }
  revalidateCms("cohorts", "newsletter");
  return row!;
}

/** Sessions taught by a removed group just lose the link. */
export async function deleteGroup(actor: Actor, id: number) {
  ensure(can.editCohort(actor, "DAP"), "This role cannot edit DAP groups");
  const db = await getDb();
  await db.delete(dapGroups).where(eq(dapGroups.id, id));
  revalidateCms("cohorts", "newsletter");
}
