import type { Programme } from "./taxonomy";

/*
 * Public addresses for CMS content. Pure functions, safe in client components.
 * A project lives under its semester or cohort:
 *   AI Lodge  /projects/ailodge/<semester>/<slug>
 *   DAP       /dap/projects/<cohort>/<slug>
 * The old /projects/<slug> addresses show a "projects have moved" page.
 */

export const cohortPath = (programme: Programme, cohortSlug: string) =>
  programme === "DAP" ? `/dap/projects/${cohortSlug}` : `/projects/ailodge/${cohortSlug}`;

export const yearbookPath = (programme: Programme) =>
  programme === "DAP" ? "/dap/projects" : "/projects/ailodge";

/** A project's page. Published projects always have a cohort; anything else falls back to the list. */
export function projectPath(p: { slug: string; badge: Programme; cohortSlug?: string }) {
  return p.cohortSlug ? `${cohortPath(p.badge, p.cohortSlug)}/${p.slug}` : "/projects";
}
