/**
 * Applies pending SQL migrations from ./drizzle.
 *
 * Runs automatically on Vercel through the `vercel-build` script, so every
 * deployment (including preview deployments on their own Neon branch) has an
 * up-to-date schema before `next build`. Locally, the PGlite database migrates
 * itself on first use; running this without DATABASE_URL does the same thing.
 *
 *   npm run db:migrate
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { MIGRATIONS_DIR, getDb } = await import("../app/lib/db");
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.VERCEL) throw new Error("DATABASE_URL is not set for this Vercel deployment");
    await getDb();
    console.log("Local PGlite database is up to date (.data/pglite).");
    return;
  }
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  await migrate(drizzle(neon(url)), { migrationsFolder: MIGRATIONS_DIR });
  console.log("Neon database is up to date.");
}

// PGlite keeps the event loop alive, so exit explicitly.
main()
  .then(async () => {
    const { closeDb } = await import("../app/lib/db");
    await closeDb();
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
