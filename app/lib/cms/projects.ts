import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import { cohorts, lodges, projects, tracks, type ProjectRow } from "@/app/lib/db/schema";
import type { HighlightCard, Project, TeamMember } from "@/app/projects/data/types";
import { can, CmsError, ensure, type Actor } from "./actor";
import { lodgePaths } from "./lodges";
import { revalidateCms, TAGS } from "./revalidate";
import {
  BUILT_WITH,
  MADE_FOR,
  PROGRAMMES,
  PROJECT_STATUSES,
  RESERVED_PROJECT_SLUGS,
  ROLE_PROGRAMME,
  type Programme,
  type ProjectStatus,
} from "./taxonomy";

export interface ProjectInput {
  title?: string;
  description?: string;
  programme?: Programme;
  cohortId?: string | null;
  /** Hack Day track (AI Lodge) */
  trackId?: number | null;
  /** Lodge the team was in (AI Lodge) */
  lodgeId?: number | null;
  madeFor?: string;
  builtWith?: string;
  coverImage?: string;
  images?: string[];
  overview?: string;
  cards?: HighlightCard[];
  team?: TeamMember[];
  techStack?: string[];
  liveUrl?: string;
  sourceUrl?: string;
  demoUrl?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const projectSelect = {
  p: projects,
  cohortName: cohorts.name,
  cohortSlug: cohorts.slug,
  trackName: tracks.name,
  trackPosition: tracks.position,
  lodgeName: lodges.name,
};

type JoinedRow = {
  p: ProjectRow;
  cohortName: string | null;
  cohortSlug: string | null;
  trackName: string | null;
  trackPosition: number | null;
  lodgeName: string | null;
};

function toProject(r: JoinedRow, lodgePath: Map<number, string>): Project {
  const p = r.p;
  return {
    slug: p.slug,
    title: p.title,
    description: p.description,
    badge: p.programme,
    programme: p.programme,
    // Legacy UI shows `category`; the technique facet replaces it.
    category: p.builtWith || p.category,
    coverImage: p.coverImage,
    images: p.images,
    overview: p.overview,
    cards: p.cards,
    team: p.team,
    techStack: p.techStack,
    demoUrl: p.demoUrl || undefined,
    sourceUrl: p.sourceUrl || undefined,
    liveUrl: p.liveUrl || undefined,
    hidden: p.status !== "published",
    status: p.status,
    cohortId: p.cohortId,
    cohortName: r.cohortName ?? undefined,
    cohortSlug: r.cohortSlug ?? undefined,
    trackId: p.trackId,
    trackName: r.trackName ?? undefined,
    trackPosition: r.trackPosition ?? undefined,
    lodgeId: p.lodgeId,
    lodgeName: r.lodgeName ?? undefined,
    lodgePath: (r.p.lodgeId && lodgePath.get(r.p.lodgeId)) || undefined,
    madeFor: p.madeFor,
    builtWith: p.builtWith,
    winner: p.winner,
    updatedAt: p.updatedAt,
    updatedBy: p.updatedBy,
  };
}

async function selectProjects(where?: ReturnType<typeof eq>) {
  const db = await getDb();
  const q = db
    .select(projectSelect)
    .from(projects)
    .leftJoin(cohorts, eq(projects.cohortId, cohorts.id))
    .leftJoin(tracks, eq(projects.trackId, tracks.id))
    .leftJoin(lodges, eq(projects.lodgeId, lodges.id));
  const rows = await (where ? q.where(where) : q).orderBy(
    asc(projects.position),
    asc(projects.createdAt)
  );
  const paths = await lodgePaths();
  return (rows as JoinedRow[]).map((r) => toProject(r, paths));
}

// ── Reads ────────────────────────────────────────────────────────────────

/** Every project, any status (CMS and MCP). */
export function listProjects(): Promise<Project[]> {
  return selectProjects();
}

/** How many projects await approval (the CMS sidebar badge, on every admin page). */
export async function countProjectsInReview(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(projects).where(eq(projects.status, "in_review"));
  return row?.n ?? 0;
}

export async function getProject(slug: string): Promise<Project | null> {
  const rows = await selectProjects(eq(projects.slug, slug));
  return rows[0] ?? null;
}

/*
 * Public pages read through Next's data cache, busted by the "projects" tag on
 * every CMS change. Errors are thrown inside the cached function so a failed
 * read is never cached, then swallowed outside it.
 */
const readPublishedCached = unstable_cache(
  () => selectProjects(eq(projects.status, "published")),
  ["cms-published-projects"],
  { revalidate: 3600, tags: [TAGS.projects] }
);

export async function getPublicProjects(): Promise<Project[]> {
  try {
    return await readPublishedCached();
  } catch (error) {
    console.error("[cms] public project list read failed", error);
    return [];
  }
}

export async function getPublicProject(slug: string): Promise<Project | null> {
  const all = await getPublicProjects();
  return all.find((p) => p.slug === slug) ?? null;
}

// ── Validation helpers ───────────────────────────────────────────────────

function cleanUrl(value: string | undefined, label: string) {
  const v = (value ?? "").trim();
  if (!v) return "";
  ensure(/^https?:\/\//i.test(v), `${label} must start with http:// or https://`);
  return v;
}

function cleanList(values: string[] | undefined) {
  return (values ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Resolves cohort, track and lodge so they always agree with each other and the programme. */
async function resolvePlacement(
  programme: Programme,
  cohortId: string | null | undefined,
  trackId: number | null | undefined,
  lodgeId: number | null | undefined
) {
  const base = await resolveCohortTrack(programme, cohortId, trackId);
  if (!lodgeId || programme !== "AI Lodge") return { ...base, lodgeId: null };
  const db = await getDb();
  const [lodge] = await db.select().from(lodges).where(eq(lodges.id, lodgeId));
  ensure(lodge, "That lodge no longer exists");
  ensure(lodge.cohortId === base.cohortId, "The lodge belongs to a different semester");
  return { ...base, lodgeId: lodge.id };
}

async function resolveCohortTrack(
  programme: Programme,
  cohortId: string | null | undefined,
  trackId: number | null | undefined
) {
  const db = await getDb();
  if (trackId) {
    const [track] = await db
      .select({ id: tracks.id, cohortId: tracks.cohortId, programme: cohorts.programme })
      .from(tracks)
      .innerJoin(cohorts, eq(tracks.cohortId, cohorts.id))
      .where(eq(tracks.id, trackId));
    ensure(track, "That track no longer exists");
    ensure(track.programme === programme, "The track belongs to a different programme");
    return { cohortId: track.cohortId, trackId: track.id };
  }
  if (cohortId) {
    const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, cohortId));
    ensure(cohort, "That cohort no longer exists");
    ensure(cohort.programme === programme, "The cohort belongs to a different programme");
    return { cohortId, trackId: null };
  }
  return { cohortId: null, trackId: null };
}

function buildValues(input: ProjectInput) {
  const v: Partial<typeof projects.$inferInsert> = {};
  if (input.title !== undefined) {
    v.title = input.title.trim();
    ensure(v.title, "Project name is required");
  }
  if (input.description !== undefined) {
    v.description = input.description.trim();
    ensure(v.description.length <= 400, "Card description is too long");
  }
  if (input.madeFor !== undefined) {
    ensure(!input.madeFor || (MADE_FOR as readonly string[]).includes(input.madeFor), `"Made for" must be one of: ${MADE_FOR.join(", ")}`);
    v.madeFor = input.madeFor;
  }
  if (input.builtWith !== undefined) {
    ensure(!input.builtWith || (BUILT_WITH as readonly string[]).includes(input.builtWith), `"Built with" must be one of: ${BUILT_WITH.join(", ")}`);
    v.builtWith = input.builtWith;
  }
  if (input.coverImage !== undefined) v.coverImage = input.coverImage.trim();
  if (input.images !== undefined) v.images = cleanList(input.images);
  if (input.overview !== undefined) v.overview = input.overview;
  if (input.cards !== undefined) {
    v.cards = input.cards.filter((c) => c.title?.trim() || c.body?.trim());
  }
  if (input.team !== undefined) v.team = input.team.filter((m) => m.name?.trim());
  if (input.techStack !== undefined) v.techStack = cleanList(input.techStack);
  if (input.liveUrl !== undefined) v.liveUrl = cleanUrl(input.liveUrl, "Live demo URL");
  if (input.sourceUrl !== undefined) v.sourceUrl = cleanUrl(input.sourceUrl, "GitHub URL");
  if (input.demoUrl !== undefined) v.demoUrl = cleanUrl(input.demoUrl, "Demo URL");
  return v;
}

// Project pages live under their semester or cohort (/projects/ailodge/<semester>/<slug>),
// so nothing goes public without one.
const NEEDS_COHORT = "Pick a semester (AI Lodge) or cohort (DAP) before publishing";

// ── Mutations ────────────────────────────────────────────────────────────

/** New projects always start as drafts (or in review, for lodge heads submitting). */
export async function createProject(
  actor: Actor,
  input: ProjectInput & { status?: ProjectStatus }
): Promise<Project> {
  const db = await getDb();
  const title = (input.title ?? "").trim();
  ensure(title, "Project name is required");
  const slug = slugify(title);
  ensure(slug, "Project name needs at least one letter or number");
  ensure(!RESERVED_PROJECT_SLUGS.includes(slug), `"${title}" clashes with a site page; pick another name`);

  const programme = input.programme ?? ROLE_PROGRAMME[actor.role] ?? "AI Lodge";
  ensure((PROGRAMMES as readonly string[]).includes(programme), "Unknown programme");
  ensure(can.editProject(actor, { programme }), "You can't add projects here");

  const [existing] = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.slug, slug));
  ensure(!existing, "A project with this name already exists");

  const placement = await resolvePlacement(programme, input.cohortId, input.trackId, input.lodgeId);
  let status: ProjectStatus = input.status === "in_review" ? "in_review" : "draft";
  if (input.status === "published" && can.publishProject(actor)) status = "published";
  ensure(status !== "published" || placement.cohortId, NEEDS_COHORT);

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${projects.position}), 0)` })
    .from(projects);

  await db.insert(projects).values({
    ...buildValues(input),
    slug,
    title,
    programme,
    ...placement,
    status,
    position: Number(max) + 1,
    updatedBy: actor.email,
  });
  revalidateCms("projects");
  return (await getProject(slug))!;
}

export async function updateProject(actor: Actor, slug: string, input: ProjectInput): Promise<Project> {
  const db = await getDb();
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug));
  ensure(row, "Project not found");
  ensure(can.editProject(actor, row), "You can't edit this project");

  let programme = row.programme;
  const cohortId = input.cohortId === undefined ? row.cohortId : input.cohortId;
  const trackId = input.trackId === undefined ? row.trackId : input.trackId;
  const lodgeId = input.lodgeId === undefined ? row.lodgeId : input.lodgeId;
  if (actor.role === "exco" && input.programme) {
    ensure((PROGRAMMES as readonly string[]).includes(input.programme), "Unknown programme");
    programme = input.programme;
  }
  // Moving to another semester drops a lodge that belonged to the old one.
  const placement = await resolvePlacement(programme, cohortId, trackId, cohortId === row.cohortId ? lodgeId : input.lodgeId ?? null);
  ensure(
    row.status !== "published" || placement.cohortId,
    "A published project needs a semester or cohort. Move it to draft first."
  );
  const movedTrack = placement.trackId !== row.trackId;

  await db
    .update(projects)
    .set({
      ...buildValues(input),
      programme,
      ...placement,
      // A winner moved to another track gives up the title.
      ...(movedTrack ? { winner: false } : {}),
      updatedAt: new Date().toISOString(),
      updatedBy: actor.email,
    })
    .where(eq(projects.slug, slug));
  revalidateCms("projects");
  return (await getProject(slug))!;
}

export async function setProjectStatus(actor: Actor, slug: string, status: ProjectStatus) {
  const db = await getDb();
  ensure((PROJECT_STATUSES as readonly string[]).includes(status), "Unknown status");
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug));
  ensure(row, "Project not found");
  ensure(can.editProject(actor, row), "You can't change this project");
  if (status === "published" || row.status === "published") {
    ensure(can.publishProject(actor), "Publishing goes through an exco review");
  }
  if (status === "published") ensure(row.cohortId, NEEDS_COHORT);
  await db
    .update(projects)
    .set({ status, updatedAt: new Date().toISOString(), updatedBy: actor.email })
    .where(eq(projects.slug, slug));
  revalidateCms("projects");
}

/** Marks a project as its track's winner, replacing any previous winner. */
export async function setProjectWinner(actor: Actor, slug: string, winner: boolean) {
  ensure(can.setWinner(actor), "Only exco can set track winners");
  const db = await getDb();
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug));
  ensure(row, "Project not found");
  if (winner) {
    ensure(row.programme === "AI Lodge" && row.trackId, "Only AI Lodge projects in a track can win");
    await db
      .update(projects)
      .set({ winner: false })
      .where(and(eq(projects.trackId, row.trackId), ne(projects.slug, slug)));
  }
  await db
    .update(projects)
    .set({ winner, updatedAt: new Date().toISOString(), updatedBy: actor.email })
    .where(eq(projects.slug, slug));
  revalidateCms("projects");
}

export async function deleteProject(actor: Actor, slug: string) {
  ensure(can.deleteProject(actor), "Only exco can delete projects");
  const db = await getDb();
  const deleted = await db.delete(projects).where(eq(projects.slug, slug)).returning({ slug: projects.slug });
  if (deleted.length === 0) throw new CmsError("Project not found");
  revalidateCms("projects");
}
