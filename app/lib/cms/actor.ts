import type { PhotoSite } from "@/app/lib/photos";
import { ROLE_PROGRAMME, type Programme, type ProjectStatus, type Role } from "./taxonomy";

/** Whoever is making a CMS change: a signed-in person or the MCP agent. */
export interface Actor {
  email: string;
  name: string;
  role: Role;
  /** A CMS_BOOTSTRAP_ADMINS email (proves access to the deployment): the only role that manages People */
  superadmin?: boolean;
  /** Lodge heads: the lodges whose projects they manage */
  lodgeIds?: number[];
}

/** The daily cron publishing scheduled newsletter issues. */
export const SCHEDULER_ACTOR: Actor = {
  email: "scheduler",
  name: "Scheduled publishing",
  role: "exco",
};

/**
 * The MCP endpoint's actor in local development when no token is sent (the
 * deployed endpoint always acts as a personal access token's owner).
 */
export const DEV_MCP_ACTOR: Actor = {
  email: "dev-mcp@localhost",
  name: "Claude (local development)",
  role: "exco",
  superadmin: true,
};

/** A validation or permission failure that is safe to show to the editor. */
export class CmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsError";
  }
}

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CmsError(message);
}

/** Exco admins work on every programme; DAP exco and AI Lodge exco on their own. Lodge heads only on their lodges. */
const onProgramme = (a: Actor, programme: Programme) =>
  a.role === "exco" || (a.role !== "lodge_head" && ROLE_PROGRAMME[a.role] === programme);

/** A lodge head's own lodge. */
const headsLodge = (a: Actor, lodgeId: number | null | undefined) =>
  a.role === "lodge_head" && lodgeId != null && (a.lodgeIds ?? []).includes(lodgeId);

type ProjectRef = { programme: Programme; lodgeId?: number | null; status?: ProjectStatus | null };

export const can = {
  publishProject: (a: Actor) => a.role === "exco",
  /** Hack Day winners exist only in AI Lodge */
  setWinner: (a: Actor) => onProgramme(a, "AI Lodge"),
  deleteProject: (a: Actor) => a.role === "exco",
  /** People, roles and other people's access tokens: superadmins only */
  managePeople: (a: Actor) => a.role === "exco" && Boolean(a.superadmin),
  editLinks: (a: Actor) => a.role === "exco",
  /** The "applications open" switch: exco, and AI Lodge exco for AI Lodge */
  setApplications: (a: Actor, programme: Programme) => a.role === "exco" || (programme === "AI Lodge" && a.role === "lodge_exco"),
  /** smubia.com photos are exco's; the AI Lodge site's photos are AI Lodge exco's too */
  editPhotos: (a: Actor, site: PhotoSite) => a.role === "exco" || (site === "ailodge" && a.role === "lodge_exco"),
  seePhotos: (a: Actor) => a.role === "exco" || a.role === "lodge_exco",
  editNewsletter: (a: Actor) => onProgramme(a, "DAP"),
  editCohort: (a: Actor, programme: Programme) => onProgramme(a, programme),
  /** Listing and opening a project: its programme's exco, or the head of its lodge */
  seeProject: (a: Actor, p: ProjectRef) => onProgramme(a, p.programme) || (p.programme === "AI Lodge" && headsLodge(a, p.lodgeId)),
  /** Lodge heads edit their lodge's drafts only: once submitted, AI Lodge exco or above takes over. */
  editProject: (a: Actor, p: ProjectRef) =>
    onProgramme(a, p.programme) || (p.programme === "AI Lodge" && headsLodge(a, p.lodgeId) && (p.status ?? "draft") === "draft"),
  /** Which admin sections a role sees */
  seeLodge: (a: Actor) => onProgramme(a, "AI Lodge"),
  seeDap: (a: Actor) => onProgramme(a, "DAP"),
};
