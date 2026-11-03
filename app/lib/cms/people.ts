import { asc, eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { people, type PersonRow } from "@/app/lib/db/schema";
import { can, ensure, type Actor } from "./actor";
import { ROLES, type Role } from "./taxonomy";

export type Person = PersonRow;

/** Comma-separated emails that always get exco access (first sign-in bootstrap). */
function bootstrapAdmins() {
  return (process.env.CMS_BOOTSTRAP_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function listPeople(): Promise<Person[]> {
  const db = await getDb();
  return db.select().from(people).orderBy(asc(people.role), asc(people.email));
}

/** Resolves a signed-in email to CMS access, or null when they have none. */
export async function findAccess(email: string): Promise<Actor | null> {
  const key = email.trim().toLowerCase();
  if (!key) return null;
  const db = await getDb();
  const [row] = await db.select().from(people).where(eq(people.email, key));
  if (row) {
    // A role that no longer exists (e.g. the retired lodge head) gives no access.
    if (!(ROLES as readonly string[]).includes(row.role)) return null;
    return { email: row.email, name: row.name || row.email, role: row.role };
  }
  if (bootstrapAdmins().includes(key)) {
    return { email: key, name: key, role: "exco" };
  }
  return null;
}

export interface PersonInput {
  email: string;
  name?: string;
  role: Role;
}

export async function savePerson(actor: Actor, input: PersonInput) {
  ensure(can.managePeople(actor), "Managing people requires the exco admin role");
  const email = input.email.trim().toLowerCase();
  ensure(/^[^@\s]+@smu\.edu\.sg$/.test(email), "Email must be an @smu.edu.sg Google account");
  ensure((ROLES as readonly string[]).includes(input.role), "Unknown role");
  ensure(email !== actor.email || input.role === actor.role, "The signed-in account cannot change its own role. Another exco admin can.");
  const values = { name: (input.name ?? "").trim(), role: input.role };
  const db = await getDb();
  await db
    .insert(people)
    .values({ email, ...values })
    .onConflictDoUpdate({ target: people.email, set: values });
}

export async function removePerson(actor: Actor, email: string) {
  ensure(can.managePeople(actor), "Managing people requires the exco admin role");
  const key = email.trim().toLowerCase();
  ensure(key !== actor.email, "The signed-in account cannot be removed. Another exco admin can remove it.");
  const db = await getDb();
  await db.delete(people).where(eq(people.email, key));
}

/** Local development only: grants the dev sign-in its chosen role. */
export async function upsertDevPerson(email: string, role: Role) {
  const db = await getDb();
  const values = { name: `Local ${role.replace("_", " ")}`, role };
  await db.insert(people).values({ email, ...values }).onConflictDoUpdate({ target: people.email, set: values });
}
