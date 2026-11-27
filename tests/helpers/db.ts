import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * Import this FIRST in an integration test file: it points the embedded database at a fresh
 * temporary folder before anything calls getDb(), so each file gets its own migrated PGlite
 * database and never touches .data/pglite. DATABASE_URL is cleared so a Neon URL in the
 * environment can't be used by accident.
 */
delete process.env.DATABASE_URL;
process.env.PGLITE_DIR = path.join(mkdtempSync(path.join(tmpdir(), "bia-it-")), "db");
