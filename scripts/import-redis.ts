/**
 * One-off (re-runnable) import of the Redis-era project data into Postgres.
 *
 * Reads `projects:index` + `project:{slug}` from Upstash (UPSTASH_REDIS_REST_*
 * in .env.local) and writes them to the database in DATABASE_URL, or to the
 * local PGlite database when it's unset. Stop `npm run dev` first when
 * importing into PGlite: only one process can open it at a time.
 *
 *   npm run db:import-redis                 # dry run: prints what would change
 *   npm run db:import-redis -- --commit     # writes
 *   npm run db:import-redis -- --commit --overwrite   # also refreshes rows that exist
 *
 * Existing Postgres rows are left alone unless --overwrite is passed, so the
 * script can be re-run to pick up projects added to Redis after cutover.
 * Cohorts are inferred from the repo naming convention (ail-ay2627-s1-…,
 * dap-ay2526-…). "Built with" / "Made for" are pre-filled from the approved
 * design's project list where titles match; everything else is set in /admin.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type LegacyProject = {
  slug: string;
  title: string;
  description?: string;
  badge?: "DAP" | "AI Lodge";
  category?: string;
  coverImage?: string;
  images?: string[];
  overview?: string;
  rationale?: string;
  cards?: { icon: string; title: string; body: string }[];
  lessons?: { satisfaction?: string; takeaway?: string };
  team?: { name: string; role: string; avatar: string; linkedin?: string; github?: string; website?: string }[];
  techStack?: string[];
  demoUrl?: string;
  sourceUrl?: string;
  liveUrl?: string;
  hidden?: boolean;
};

const FACETS: Record<string, [string, string]> = {
  "Singing Scorer": ["Classic ML", "Fun & creative"],
  "Enhance AI": ["Image generation", "Fun & creative"],
  CaloTracko: ["LLM apps", "Health & wellbeing"],
  Storie: ["Image generation", "Fun & creative"],
  "Tarot Card Interpreter": ["LLM apps", "Fun & creative"],
  "AlphaZero Checkers": ["Classic ML", "Fun & creative"],
  "Colour Season Analysis": ["Computer vision", "Everyday life"],
  "F1 Qualifying Predictor": ["Classic ML", "Fun & creative"],
  "Distracted Driver Detection": ["Computer vision", "Safety & trust"],
  "Pitch Perfect": ["Computer vision", "Students"],
  "Learning Companion": ["LLM apps", "Students"],
  ScamSense: ["Agents", "Safety & trust"],
  HiddenInk: ["LLM apps", "Safety & trust"],
  Squirrel: ["Agents", "Money"],
  Fitinerary: ["Agents", "Everyday life"],
  "SG Wardrobe": ["LLM apps", "Everyday life"],
  Dishcovery: ["LLM apps", "Health & wellbeing"],
  MemeMe: ["Image generation", "Fun & creative"],
  "Meme-it": ["Image generation", "Fun & creative"],
  "EquityLens AI": ["Agents", "Money"],
  Syllabuddy: ["LLM apps", "Students"],
  TouchGrass: ["LLM apps", "Health & wellbeing"],
  Leash: ["Agents", "Safety & trust"],
  Origin: ["Agents", "Money"],
  Handful: ["Computer vision", "Students"],
};
const facetFor = (title: string) => {
  const key = Object.keys(FACETS).find((k) => k.toLowerCase() === title.trim().toLowerCase());
  return key ? FACETS[key] : null;
};

/** "ail-ay2627-s1-…" → AI Lodge ay2627-s1; "dap-ay2526-…" → DAP ay2526 */
function inferCohort(p: LegacyProject): { programme: "AI Lodge" | "DAP"; slug: string; name: string } | null {
  const haystack = [p.sourceUrl, p.liveUrl, p.demoUrl, p.slug].filter(Boolean).join(" ");
  const lodge = haystack.match(/ail-ay(\d{2})(\d{2})-s(\d)/);
  if (lodge) {
    return { programme: "AI Lodge", slug: `ay${lodge[1]}${lodge[2]}-s${lodge[3]}`, name: `AY${lodge[1]}/${lodge[2]} Semester ${lodge[3]}` };
  }
  const dap = haystack.match(/dap-ay(\d{2})(\d{2})/);
  if (dap) return { programme: "DAP", slug: `ay${dap[1]}${dap[2]}`, name: `AY${dap[1]}/${dap[2]} cohort` };
  return null;
}

function legacyCards(p: LegacyProject) {
  if (p.cards && p.cards.length > 0) return p.cards.filter((c) => c.title?.trim() || c.body?.trim());
  const out = [];
  if (p.lessons?.satisfaction?.trim()) out.push({ icon: "circle-check", title: "Project Satisfaction", body: p.lessons.satisfaction });
  if (p.lessons?.takeaway?.trim()) out.push({ icon: "lightbulb", title: "Key Takeaway", body: p.lessons.takeaway });
  return out;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const overwrite = process.argv.includes("--overwrite");

  const { Redis } = await import("@upstash/redis");
  const { eq } = await import("drizzle-orm");
  const { getDb, usingLocalDb } = await import("../app/lib/db");
  const { cohorts, projects } = await import("../app/lib/db/schema");
  const { cohortIdFor } = await import("../app/lib/cms/cohorts");

  const redis = Redis.fromEnv();
  const slugs = (await redis.lrange<string>("projects:index", 0, -1)) ?? [];
  const records = slugs.length ? await redis.mget<(LegacyProject | null)[]>(...slugs.map((s) => `project:${s}`)) : [];
  const legacy = records.filter((p): p is LegacyProject => p !== null);
  console.log(`Redis: ${legacy.length} projects. Target: ${usingLocalDb() ? "local PGlite (.data/pglite)" : "DATABASE_URL"}.`);

  const db = await getDb();

  // Cohorts first: newest AI Lodge semester is live, everything else archived.
  const found = new Map<string, { programme: "AI Lodge" | "DAP"; slug: string; name: string }>();
  for (const p of legacy) {
    const c = inferCohort(p);
    if (c) found.set(cohortIdFor(c.programme, c.slug), c);
  }
  const newestLodge = Array.from(found.values()).filter((c) => c.programme === "AI Lodge").map((c) => c.slug).sort().pop();
  for (const [id, c] of Array.from(found.entries())) {
    const [exists] = await db.select({ id: cohorts.id }).from(cohorts).where(eq(cohorts.id, id));
    const visibility = c.programme === "AI Lodge" && c.slug === newestLodge ? "live" : "archived";
    console.log(`${exists ? "keep  " : "create"} cohort ${id} (${c.name}, ${visibility})`);
    if (commit && !exists) await db.insert(cohorts).values({ id, programme: c.programme, slug: c.slug, name: c.name, visibility });
  }

  // A programme with a single known cohort claims its uncategorised projects.
  const onlyCohort = (programme: "AI Lodge" | "DAP") => {
    const ids = Array.from(found.entries()).filter(([, c]) => c.programme === programme).map(([id]) => id);
    return ids.length === 1 ? ids[0] : null;
  };

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (let index = 0; index < legacy.length; index++) {
    const p = legacy[index];
    const programme: "AI Lodge" | "DAP" = p.badge === "AI Lodge" ? "AI Lodge" : "DAP";
    const cohort = inferCohort(p);
    const facets = facetFor(p.title);
    const values = {
      slug: p.slug,
      title: p.title,
      description: p.description ?? "",
      programme,
      cohortId:
        cohort && cohort.programme === programme ? cohortIdFor(cohort.programme, cohort.slug) : onlyCohort(programme),
      madeFor: facets?.[1] ?? "",
      builtWith: facets?.[0] ?? "",
      category: p.category ?? "",
      coverImage: p.coverImage ?? "",
      images: (p.images ?? []).filter(Boolean),
      overview: [p.overview, p.rationale].map((s) => s?.trim()).filter(Boolean).join("\n\n"),
      cards: legacyCards(p),
      team: p.team ?? [],
      techStack: p.techStack ?? [],
      demoUrl: p.demoUrl ?? "",
      sourceUrl: p.sourceUrl ?? "",
      liveUrl: p.liveUrl || "",
      status: (p.hidden ? "draft" : "published") as "draft" | "published",
      position: index + 1,
      updatedBy: "redis-import",
    };
    const [exists] = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.slug, p.slug));
    if (exists && !overwrite) {
      skipped++;
      continue;
    }
    console.log(`${exists ? "update" : "create"} ${p.slug.padEnd(40)} ${programme.padEnd(8)} ${values.status.padEnd(9)} ${values.cohortId ?? "(no cohort)"}${facets ? "" : "  [facets to fill in]"}`);
    if (commit) {
      if (exists) {
        const { slug: _slug, ...rest } = values;
        void _slug;
        await db.update(projects).set(rest).where(eq(projects.slug, p.slug));
      } else {
        await db.insert(projects).values(values);
      }
    }
    exists ? updated++ : created++;
  }

  console.log(`\n${commit ? "Done" : "Dry run"}: ${created} to create, ${updated} to update, ${skipped} already in Postgres (use --overwrite to refresh).`);
  if (!commit) console.log("Nothing was written. Re-run with --commit to apply.");
  if (commit) console.log("Tracks aren't in Redis: create them on /admin/semester and assign projects.");
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
