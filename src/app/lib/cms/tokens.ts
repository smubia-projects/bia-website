import { createHash, randomBytes } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { accessTokens, type AccessTokenRow } from "@/app/lib/db/schema";
import { can, ensure, type Actor } from "./actor";
import { findAccess } from "./people";

/*
 * Personal access tokens for the MCP endpoint (/api/mcp). Each belongs to one
 * person and acts with that person's current role, so Claude can do exactly
 * what they can do in /admin and its edits are attributed to them.
 */

const PREFIX = "smubia_pat_";
export const TOKEN_LIFETIMES = [30, 90, 365, 0] as const; // days; 0 = no expiry

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type AccessToken = Omit<AccessTokenRow, "tokenHash"> & { expired: boolean };

function publicFields(row: AccessTokenRow): AccessToken {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tokenHash, ...rest } = row;
  return { ...rest, expired: Boolean(row.expiresAt && Date.parse(row.expiresAt) < Date.now()) };
}

export async function listTokens(actor: Actor): Promise<AccessToken[]> {
  const db = await getDb();
  const rows = await db.select().from(accessTokens).where(eq(accessTokens.email, actor.email)).orderBy(desc(accessTokens.createdAt));
  return rows.map(publicFields);
}

/** Returns the token itself: it is never shown again. */
export async function createToken(actor: Actor, input: { name: string; days: number }): Promise<{ token: string; row: AccessToken }> {
  const name = input.name.trim();
  ensure(name, "Token name required, for example \"Claude Code, personal laptop\"");
  ensure((TOKEN_LIFETIMES as readonly number[]).includes(input.days), "Token expiry required");
  const token = PREFIX + randomBytes(32).toString("base64url");
  const db = await getDb();
  const [row] = await db
    .insert(accessTokens)
    .values({
      email: actor.email,
      name,
      tokenHash: hash(token),
      preview: token.slice(0, PREFIX.length + 4),
      expiresAt: input.days ? new Date(Date.now() + input.days * 86_400_000).toISOString() : null,
    })
    .returning();
  return { token, row: publicFields(row) };
}

/** Your own tokens; exco admins can revoke anyone's. */
export async function revokeToken(actor: Actor, id: number) {
  const db = await getDb();
  const [row] = await db.select().from(accessTokens).where(eq(accessTokens.id, id));
  ensure(row && (row.email === actor.email || can.managePeople(actor)), "Token not found");
  await db.update(accessTokens).set({ revokedAt: new Date().toISOString() }).where(and(eq(accessTokens.id, id), isNull(accessTokens.revokedAt)));
}

/**
 * The person a bearer token acts as, with their role read fresh, or null when the
 * token is unknown, revoked or expired, or its owner no longer has CMS access.
 */
export async function actorForToken(token: string): Promise<Actor | null> {
  if (!token.startsWith(PREFIX)) return null;
  const db = await getDb();
  const [row] = await db.select().from(accessTokens).where(eq(accessTokens.tokenHash, hash(token)));
  if (!row || row.revokedAt || (row.expiresAt && Date.parse(row.expiresAt) < Date.now())) return null;
  const person = await findAccess(row.email);
  if (!person) return null;
  // Last-used is only for the tokens page; once an hour is precise enough.
  if (!row.lastUsedAt || Date.now() - Date.parse(row.lastUsedAt) > 3_600_000) {
    await db.update(accessTokens).set({ lastUsedAt: new Date().toISOString() }).where(eq(accessTokens.id, row.id));
  }
  return { ...person, name: `${person.name} (via Claude)` };
}
