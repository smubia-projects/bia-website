import path from "path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

/*
 * One client per process. With DATABASE_URL set (Vercel, or a Neon branch in
 * .env.local) this is Neon over HTTP. Without it, local development gets an
 * embedded Postgres (PGlite) stored in .data/pglite, migrated on first use, so
 * the site runs on localhost with no database account at all.
 *
 * Neon's HTTP driver has no interactive transactions, so CMS code never calls
 * db.transaction(); multi-row invariants are kept with single statements and
 * the unique indexes in schema.ts.
 */
const globalForDb = globalThis as unknown as {
  __cmsDb?: Promise<Db>;
  __cmsLocalClient?: { close(): Promise<void> };
};

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(url), { schema }) as unknown as Db;
  }

  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set for this Vercel deployment");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");

  // PGlite is single-process: a second process opening the same directory
  // corrupts it. `next build` prerenders in worker processes, and a dev server
  // can overlap with a script, so only the process holding the lock gets the
  // on-disk database. Everyone else gets an empty in-memory one.
  const onDisk = process.env.NEXT_PHASE !== "phase-production-build" && acquireLock(dir);
  if (!onDisk) {
    console.warn(`[db] ${dir} is in use by another process; using an empty in-memory database here.`);
  }
  const client = onDisk ? new PGlite(dir) : new PGlite();
  if (onDisk) closeOnExit(client, dir);
  globalForDb.__cmsLocalClient = client;
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return db as unknown as Db;
}

/** Exclusive lock file next to the data dir; stale locks (dead pid) are taken over. */
function acquireLock(dir: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs") as typeof import("fs");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  const lock = `${dir}.lock`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
      return true;
    } catch {
      const owner = Number(fs.readFileSync(lock, "utf8"));
      if (owner === process.pid) return true;
      if (owner && isAlive(owner)) return false;
      fs.rmSync(lock, { force: true }); // stale: its process is gone
    }
  }
  return false;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/** Flush and release on shutdown; an unclean stop can leave PGlite unreadable. */
function closeOnExit(client: { close(): Promise<void> }, dir: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs") as typeof import("fs");
  const release = () => fs.rmSync(`${dir}.lock`, { force: true });
  let closing = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (closing) return;
    closing = true;
    client
      .close()
      .catch(() => undefined)
      .finally(() => {
        release();
        process.kill(process.pid, signal);
      });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("exit", release);
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__cmsDb) {
    globalForDb.__cmsDb = createDb().catch((error) => {
      // Let the next call retry instead of caching a failed connection.
      globalForDb.__cmsDb = undefined;
      throw error;
    });
  }
  return globalForDb.__cmsDb;
}

export const usingLocalDb = () => !process.env.DATABASE_URL;

/** Scripts call this before exiting so the local PGlite files are flushed. */
export async function closeDb() {
  const client = globalForDb.__cmsLocalClient;
  globalForDb.__cmsLocalClient = undefined;
  globalForDb.__cmsDb = undefined;
  if (client) await client.close();
}

export { schema };
