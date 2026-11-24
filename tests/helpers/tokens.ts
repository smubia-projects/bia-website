import { getDb } from "@/app/lib/db";
import { people } from "@/app/lib/db/schema";
import type { Actor } from "@/app/lib/cms/actor";
import { createToken } from "@/app/lib/cms/tokens";
import type { Role } from "@/app/lib/cms/taxonomy";

/** Puts a person on the People list and makes them a personal access token for the MCP. */
export async function personWithToken(input: { email: string; name?: string; role: Role; lodgeIds?: number[]; days?: number }) {
  const db = await getDb();
  await db
    .insert(people)
    .values({ email: input.email, name: input.name ?? input.email, role: input.role, lodgeIds: input.lodgeIds ?? [] })
    .onConflictDoNothing();
  const actor: Actor = { email: input.email, name: input.name ?? input.email, role: input.role, lodgeIds: input.lodgeIds };
  const { token, row } = await createToken(actor, { name: "test", days: input.days ?? 30 });
  return { actor, token, tokenId: row.id };
}
