import type { CohortVisibility, Programme } from "@/app/lib/cms/taxonomy";

/*
 * CMS addresses for a programme run (an AI Lodge semester or a DAP cohort).
 * The run is in the path, like a Vercel project:
 *   /admin/ailodge/<semester>[/projects]
 *   /admin/dap/<cohort>[/groups | /schedule | /newsletter[/<id>] | /projects]
 * Pure functions, safe in client components.
 */

export interface RunOption {
  programme: Programme;
  slug: string;
  name: string;
  visibility: CohortVisibility;
}

export interface RunSection {
  key: string;
  label: string;
}

export const RUN_SEGMENT: Record<Programme, string> = { "AI Lodge": "ailodge", DAP: "dap" };

export const RUN_NOUN: Record<Programme, string> = { "AI Lodge": "semester", DAP: "cohort" };

/** Each run's pages, in sidebar order. The first key ("") is the overview. */
export const RUN_SECTIONS: Record<Programme, RunSection[]> = {
  "AI Lodge": [
    { key: "", label: "Overview" },
    { key: "lodges", label: "Lodges" },
    { key: "projects", label: "Projects" },
  ],
  DAP: [
    { key: "", label: "Overview" },
    { key: "groups", label: "Co-learning groups" },
    { key: "schedule", label: "Schedule" },
    { key: "newsletter", label: "Newsletter" },
    { key: "projects", label: "Projects" },
  ],
};

export const runHref = (programme: Programme, slug: string, section = "") =>
  `/admin/${RUN_SEGMENT[programme]}/${slug}${section ? `/${section}` : ""}`;

export const newRunHref = (programme: Programme) => `/admin/${RUN_SEGMENT[programme]}/new`;

/** Reads a run from a CMS path: /admin/dap/ay2627/groups → DAP, ay2627, groups. */
export function parseRunPath(pathname: string): { programme: Programme; slug: string; section: string } | null {
  const m = pathname.match(/^\/admin\/(ailodge|dap)\/([a-z0-9-]+)(?:\/([a-z-]+))?/);
  if (!m || m[2] === "new") return null;
  return { programme: m[1] === "dap" ? "DAP" : "AI Lodge", slug: m[2], section: m[3] ?? "" };
}

/** The cookie that remembers the last run opened, as "<segment>/<slug>". */
export const RUN_COOKIE = "cms_run";
