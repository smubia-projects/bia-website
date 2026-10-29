import { defineConfig } from "drizzle-kit";

// Only `drizzle-kit generate` uses this (it diffs schema.ts, no database needed).
// Migrations are applied by scripts/db-migrate.ts on Vercel and automatically
// for the local PGlite database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./app/lib/db/schema.ts",
  out: "./drizzle",
});
