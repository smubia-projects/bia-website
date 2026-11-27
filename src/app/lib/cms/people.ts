import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { cohorts, lodges, people, type PersonRow } from "@/app/lib/db/schema";
import { can, ensure, type Actor } from "./actor";
import { ROLES, suggestedAccessEnd, type Role } from "./taxonomy";

export type Person = PersonRow;

/** The dev sign-in's superadmin (local development only). */
export const DEV_SUPERADMIN_EMAIL = "dev-superadmin@localhost";

/** Comma-separated emails that are superadmins: exco admins who also manage People. */
export function bootstrapAdmins() {
  return (process.env.CMS_BOOTSTRAP_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isSuperadmin(email: string) {
  if (bootstrapAdmins().includes(email)) return true;
  return process.env.NODE_ENV !== "production" && (email === DEV_SUPERADMIN_EMAIL || email === "dev-mcp@localhost");
}

/** Today in Singapore, as YYYY-MM-DD. */
export function todaySgt() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

export const accessExpired = (p: { accessEnds: string | null }) => Boolean(p.accessEnds && p.accessEnds < todaySgt());

export async function listPeople(): Promise<Person[]> {
  const db = await getDb();
  return db.select().from(people).orderBy(asc(people.role), asc(people.email));
}

/** Resolves a signed-in email to CMS access, or null when they have none. */
export async function findAccess(email: string): Promise<Actor | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  if (isSuperadmin(key)) {
    const db = await getDb();
    const [row] = await db.select({ name: people.name }).from(people).where(eq(people.email, key));
    return { email: key, name: row?.name || key, role: "exco", superadmin: true };
  }
  const db = await getDb();
  const [row] = await db.select().from(people).where(eq(people.email, key));
  if (!row) return null;
  if (!(ROLES as readonly string[]).includes(row.role)) return null;
  if (accessExpired(row)) return null;
  return {
    email: row.email,
    name: row.name || row.email,
    role: row.role,
    ...(row.role === "lodge_head" ? { lodgeIds: row.lodgeIds } : {}),
  };
}

/** Lodges with their semester, for the People page and lodge-head checks. */
export async function lodgeOptions(ids?: number[]) {
  const db = await getDb();
  const q = db
    .select({ id: lodges.id, name: lodges.name, slug: lodges.slug, cohortId: lodges.cohortId, cohortName: cohorts.name, startsOn: cohorts.startsOn })
    .from(lodges)
    .innerJoin(cohorts, eq(lodges.cohortId, cohorts.id));
  if (ids) {
    if (ids.length === 0) return [];
    return q.where(inArray(lodges.id, ids));
  }
  return q.orderBy(asc(cohorts.id), asc(lodges.position));
}

/** A lodge head's default last day: 20 weeks from the latest of their semesters' week 1. */
export async function defaultAccessEnd(lodgeIds: number[]): Promise<string | null> {
  return suggestedAccessEnd((await lodgeOptions(lodgeIds)).map((l) => l.startsOn));
}

export interface PersonInput {
  email: string;
  name?: string;
  role: Role;
  /** Lodge heads only */
  lodgeIds?: number[];
  /** YYYY-MM-DD; null = no end; omitted for a lodge head = the default from their semester */
  accessEnds?: string | null;
}

const MANAGE = "Managing people requires a superadmin (an email in CMS_BOOTSTRAP_ADMINS)";

function cleanEmail(email: string) {
  const key = email.trim().toLowerCase();
  ensure(/^[^@\s]+@smu\.edu\.sg$/.test(key), `${key || "Email"} must be an @smu.edu.sg Google account`);
  return key;
}

export async function savePerson(actor: Actor, input: PersonInput) {
  ensure(can.managePeople(actor), MANAGE);
  const email = cleanEmail(input.email);
  ensure((ROLES as readonly string[]).includes(input.role), "Unknown role");
  ensure(!isSuperadmin(email), `${email} is a superadmin (CMS_BOOTSTRAP_ADMINS): its access is set in the deployment, not here`);
  const head = input.role === "lodge_head";
  const lodgeIds = head ? [...new Set(input.lodgeIds ?? [])] : [];
  if (head) {
    ensure(lodgeIds.length > 0, "Pick at least one lodge for a lodge head");
    const found = await lodgeOptions(lodgeIds);
    ensure(found.length === lodgeIds.length, "One of the lodges no longer exists");
  }
  let accessEnds: string | null = null;
  if (head) {
    accessEnds = input.accessEnds === undefined ? await defaultAccessEnd(lodgeIds) : input.accessEnds;
    ensure(accessEnds === null || /^\d{4}-\d{2}-\d{2}$/.test(accessEnds), "Access end must be a date (YYYY-MM-DD)");
  }
  const values = { name: (input.name ?? "").trim(), role: input.role, lodgeIds, accessEnds };
  const db = await getDb();
  await db
    .insert(people)
    .values({ email, ...values })
    .onConflictDoUpdate({ target: people.email, set: values });
  return { email, ...values };
}

export async function removePerson(actor: Actor, email: string) {
  ensure(can.managePeople(actor), MANAGE);
  const key = email.trim().toLowerCase();
  ensure(key !== actor.email, "The signed-in account cannot be removed.");
  const db = await getDb();
  await db.delete(people).where(eq(people.email, key));
}

export interface LodgeHeadRow {
  /** Lodge name or URL slug, within the semester */
  lodge: string;
  email: string;
  name?: string;
}

/**
 * Sets a semester's lodge heads from a table of lodge → email. Each listed lodge's
 * heads become exactly the listed people (others lose that lodge); lodges not in
 * the table keep theirs. New people are added as lodge heads; access ends on the
 * default date from the semester's week 1.
 */
export async function setLodgeHeads(actor: Actor, cohortId: string, rows: LodgeHeadRow[]) {
  ensure(can.managePeople(actor), MANAGE);
  const db = await getDb();
  const all = (await lodgeOptions()).filter((l) => l.cohortId === cohortId);
  ensure(all.length > 0, "That semester has no lodges");
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+lodge$/, "");
  const wanted = new Map<number, Set<string>>();
  const names = new Map<string, string>();
  for (const r of rows) {
    const lodge = all.find((l) => norm(l.name) === norm(r.lodge) || l.slug === r.lodge.trim().toLowerCase());
    ensure(lodge, `No lodge "${r.lodge}" in this semester. Lodges: ${all.map((l) => l.name).join(", ")}`);
    const email = cleanEmail(r.email);
    if (!wanted.has(lodge.id)) wanted.set(lodge.id, new Set());
    wanted.get(lodge.id)!.add(email);
    if (r.name?.trim()) names.set(email, r.name.trim());
  }
  const touched = [...wanted.keys()];
  const listed = new Set([...wanted.values()].flatMap((s) => [...s]));
  const existing = await listPeople();
  const skipped: string[] = [];
  const saved: { email: string; lodges: string[]; accessEnds: string | null }[] = [];

  // People no longer heading a touched lodge lose it.
  for (const p of existing) {
    if (p.role !== "lodge_head" || listed.has(p.email)) continue;
    const kept = p.lodgeIds.filter((id) => !touched.includes(id));
    if (kept.length !== p.lodgeIds.length) {
      await db.update(people).set({ lodgeIds: kept }).where(eq(people.email, p.email));
    }
  }

  for (const email of listed) {
    const person = existing.find((p) => p.email === email);
    if (isSuperadmin(email) || (person && person.role !== "lodge_head")) {
      skipped.push(`${email} (already ${isSuperadmin(email) ? "a superadmin" : person!.role})`);
      continue;
    }
    const mine = touched.filter((id) => wanted.get(id)!.has(email));
    const lodgeIds = [...new Set([...(person?.lodgeIds ?? []).filter((id) => !touched.includes(id)), ...mine])];
    const accessEnds = await defaultAccessEnd(lodgeIds);
    const values = { name: names.get(email) ?? person?.name ?? "", role: "lodge_head" as const, lodgeIds, accessEnds };
    await db.insert(people).values({ email, ...values }).onConflictDoUpdate({ target: people.email, set: values });
    saved.push({ email, lodges: all.filter((l) => mine.includes(l.id)).map((l) => l.name), accessEnds });
  }
  return { saved, skipped };
}

/** Local development only: grants the dev sign-in its chosen role (a dev lodge head heads the current semester's lodges). */
export async function upsertDevPerson(email: string, role: Role) {
  const db = await getDb();
  let lodgeIds: number[] = [];
  if (role === "lodge_head") {
    const all = await lodgeOptions();
    const latest = all.map((l) => l.cohortId).sort().pop();
    lodgeIds = all.filter((l) => l.cohortId === latest).map((l) => l.id);
  }
  const values = { name: `Local ${role.replace("_", " ")}`, role, lodgeIds, accessEnds: null };
  await db.insert(people).values({ email, ...values }).onConflictDoUpdate({ target: people.email, set: values });
}
