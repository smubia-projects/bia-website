import { asc, eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, people, tracks, type PersonRow } from "@/app/lib/db/schema";
import { can, ensure, type Actor } from "./actor";
import { ROLES, type Role } from "./taxonomy";

export type Person = PersonRow & { trackName: string | null; cohortName: string | null };

/** Comma-separated emails that always get exco access (first sign-in bootstrap). */
function bootstrapAdmins() {
  return (process.env.CMS_BOOTSTRAP_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function listPeople(): Promise<Person[]> {
  const db = await getDb();
  const rows = await db
    .select({ p: people, trackName: tracks.name, cohortName: cohorts.name })
    .from(people)
    .leftJoin(tracks, eq(people.trackId, tracks.id))
    .leftJoin(cohorts, eq(tracks.cohortId, cohorts.id))
    .orderBy(asc(people.role), asc(people.email));
  return rows.map((r) => ({ ...r.p, trackName: r.trackName, cohortName: r.cohortName }));
}

/** Resolves a signed-in email to CMS access, or null when they have none. */
export async function findAccess(email: string): Promise<Actor | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  const db = await getDb();
  const [row] = await db.select().from(people).where(eq(people.email, key));
  if (row) {
    return { email: row.email, name: row.name || row.email, role: row.role, trackId: row.trackId };
  }
  if (bootstrapAdmins().includes(key)) {
    return { email: key, name: key, role: "exco", trackId: null };
  }
  return null;
}

export interface PersonInput {
  email: string;
  name?: string;
  role: Role;
  trackId?: number | null;
}

export async function savePerson(actor: Actor, input: PersonInput) {
  ensure(can.managePeople(actor), "Only exco can manage people");
  const email = input.email.trim().toLowerCase();
  ensure(/^[^@\s]+@smu\.edu\.sg$/.test(email), "Use an @smu.edu.sg Google account");
  ensure((ROLES as readonly string[]).includes(input.role), "Unknown role");
  const trackId = input.role === "lodge_head" ? input.trackId ?? null : null;
  ensure(input.role !== "lodge_head" || trackId, "Pick the lodge head's track");
  const values = { name: (input.name ?? "").trim(), role: input.role, trackId };
  const db = await getDb();
  await db
    .insert(people)
    .values({ email, ...values })
    .onConflictDoUpdate({ target: people.email, set: values });
}

export async function removePerson(actor: Actor, email: string) {
  ensure(can.managePeople(actor), "Only exco can manage people");
  const key = email.trim().toLowerCase();
  ensure(key !== actor.email, "You can't remove yourself");
  const db = await getDb();
  await db.delete(people).where(eq(people.email, key));
}

/** Local development only: grants the dev sign-in its chosen role. */
export async function upsertDevPerson(email: string, role: Role, trackId: number | null) {
  const db = await getDb();
  const values = { name: `Local ${role.replace("_", " ")}`, role, trackId };
  await db.insert(people).values({ email, ...values }).onConflictDoUpdate({ target: people.email, set: values });
}
