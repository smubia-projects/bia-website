import type { Programme } from "./taxonomy";

/*
 * Public addresses for CMS content. Pure functions, safe in client components.
 * Every project lives under /projects, in its semester or cohort:
 *   AI Lodge  /projects/ailodge/<semester>/<slug>
 *   DAP       /projects/dap/<cohort>/<slug>
 * A DAP cohort also has a run page with its newsletter, schedule and groups:
 *   /dap/<cohort>, /dap/<cohort>/week-<n>
 * The old /projects/<slug> addresses show a "projects have moved" page.
 */

const PROGRAMME_SEGMENT: Record<Programme, string> = { "AI Lodge": "ailodge", DAP: "dap" };

export const yearbookPath = (programme: Programme) => `/projects/${PROGRAMME_SEGMENT[programme]}`;

export const cohortPath = (programme: Programme, cohortSlug: string) => `${yearbookPath(programme)}/${cohortSlug}`;

/** A project's page. Published projects always have a cohort; anything else falls back to the list. */
export function projectPath(p: { slug: string; badge: Programme; cohortSlug?: string }) {
  return p.cohortSlug ? `${cohortPath(p.badge, p.cohortSlug)}/${p.slug}` : "/projects";
}

/** A DAP cohort's run page: latest issue, schedule and groups. */
export const dapRunPath = (cohortSlug: string) => `/dap/${cohortSlug}`;

/** One "This week in DAP" issue. */
export const issuePath = (cohortSlug: string, week: number) => `${dapRunPath(cohortSlug)}/week-${week}`;
