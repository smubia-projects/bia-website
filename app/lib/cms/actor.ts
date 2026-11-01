import type { PhotoSite } from "@/app/lib/photos";
import { ROLE_PROGRAMME, type Programme, type Role } from "./taxonomy";

/** Whoever is making a CMS change: a signed-in person or the MCP agent. */
export interface Actor {
  email: string;
  name: string;
  role: Role;
}

/** The MCP endpoint acts with exco rights; its edits are attributed to it. */
export const AGENT_ACTOR: Actor = {
  email: "mcp-agent",
  name: "Claude (MCP)",
  role: "exco",
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

/** Exco admins work on every programme; DAP exco and AI Lodge exco on their own. */
const onProgramme = (a: Actor, programme: Programme) => a.role === "exco" || ROLE_PROGRAMME[a.role] === programme;

export const can = {
  publishProject: (a: Actor) => a.role === "exco",
  /** Hack Day winners exist only in AI Lodge */
  setWinner: (a: Actor) => onProgramme(a, "AI Lodge"),
  deleteProject: (a: Actor) => a.role === "exco",
  managePeople: (a: Actor) => a.role === "exco",
  editLinks: (a: Actor) => a.role === "exco",
  /** The "applications open" switch: exco, and AI Lodge exco for AI Lodge */
  setApplications: (a: Actor, programme: Programme) => a.role === "exco" || (programme === "AI Lodge" && a.role === "lodge_exco"),
  /** smubia.com photos are exco's; the AI Lodge site's photos are AI Lodge exco's too */
  editPhotos: (a: Actor, site: PhotoSite) => a.role === "exco" || (site === "ailodge" && a.role === "lodge_exco"),
  seePhotos: (a: Actor) => a.role === "exco" || a.role === "lodge_exco",
  editNewsletter: (a: Actor) => onProgramme(a, "DAP"),
  editCohort: (a: Actor, programme: Programme) => onProgramme(a, programme),
  editProject: (a: Actor, p: { programme: Programme }) => onProgramme(a, p.programme),
  /** Which admin sections a role sees */
  seeLodge: (a: Actor) => onProgramme(a, "AI Lodge"),
  seeDap: (a: Actor) => onProgramme(a, "DAP"),
};
