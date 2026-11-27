import "server-only";
import type { Actor } from "./actor";
import type { PhotoSite } from "@/shared/photos";
import type { Programme, ProjectStatus, Role } from "@/shared/taxonomy";

/*
 * Who may do what. The plain rules are one table, ROLE_CAPS: each role's capabilities.
 * The rules that depend on the thing being changed (a lodge head's own lodge, a project's
 * status, which site a photo is on) are functions in `can` that read the table. The admin
 * UI, the service layer and the MCP tool list (TOOL_ACCESS) all read this one table, and
 * tests/integration/permissions.test.ts pins the result for every service write.
 */
export const CAPABILITIES = [
  /** Publish a project, or unpublish one */
  "publishProject",
  "deleteProject",
  /** People, roles and other people's access tokens */
  "managePeople",
  /** Site links (club URLs) */
  "editLinks",
  /** The bot's settings (webhook, DAP channel) and other people's linked Telegram accounts */
  "manageTelegramBot",
  /** The Photos page */
  "seePhotos",
  "editSmubiaPhotos",
  "editAILodgePhotos",
  /** The "applications open" switches */
  "setAILodgeApplications",
  "setDapApplications",
  /** A programme's runs, tracks, lodges, co-learning groups and projects */
  "editAILodge",
  "editDap",
  /** Hack Day winners (AI Lodge only) */
  "setWinner",
  /** The admin sections a role sees */
  "seeLodge",
  "seeDap",
  "editNewsletter",
  /** DAP timeline tracker: dashboard, and admin rights in the Telegram chats */
  "tracker",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** A superadmin is an exco admin whose email is in CMS_BOOTSTRAP_ADMINS. */
type PermissionRole = Role | "superadmin";

const AI_LODGE_EXCO: Capability[] = ["editAILodge", "seeLodge", "setWinner", "setAILodgeApplications", "seePhotos", "editAILodgePhotos"];
const DAP_EXCO: Capability[] = ["editDap", "seeDap", "editNewsletter", "tracker"];
const EXCO: Capability[] = CAPABILITIES.filter((c) => c !== "managePeople");

const ROLE_CAPS: Record<PermissionRole, readonly Capability[]> = {
  superadmin: CAPABILITIES,
  exco: EXCO,
  dap_exco: DAP_EXCO,
  lodge_exco: AI_LODGE_EXCO,
  /** Lodge heads have no plain capabilities: only their own lodges' drafts (see can.editProject) */
  lodge_head: [],
};

const roleOf = (a: Actor): PermissionRole => (a.role === "exco" && a.superadmin ? "superadmin" : a.role);

/** Whether the actor's role has a capability. */
const has = (a: Actor, cap: Capability) => ROLE_CAPS[roleOf(a)].includes(cap);

/** Whether the actor's role has any of the capabilities. */
export const hasAny = (a: Actor, caps: readonly Capability[]) => caps.some((c) => has(a, c));

const PROGRAMME_CAP: Record<Programme, Capability> = { "AI Lodge": "editAILodge", DAP: "editDap" };

/** A lodge head's own lodge. */
const headsLodge = (a: Actor, lodgeId: number | null | undefined) =>
  a.role === "lodge_head" && lodgeId != null && (a.lodgeIds ?? []).includes(lodgeId);

type ProjectRef = { programme: Programme; lodgeId?: number | null; status?: ProjectStatus | null };

export const can = {
  publishProject: (a: Actor) => has(a, "publishProject"),
  setWinner: (a: Actor) => has(a, "setWinner"),
  deleteProject: (a: Actor) => has(a, "deleteProject"),
  managePeople: (a: Actor) => has(a, "managePeople"),
  editLinks: (a: Actor) => has(a, "editLinks"),
  manageTelegramBot: (a: Actor) => has(a, "manageTelegramBot"),
  setApplications: (a: Actor, programme: Programme) => has(a, programme === "AI Lodge" ? "setAILodgeApplications" : "setDapApplications"),
  editPhotos: (a: Actor, site: PhotoSite) => has(a, site === "ailodge" ? "editAILodgePhotos" : "editSmubiaPhotos"),
  seePhotos: (a: Actor) => has(a, "seePhotos"),
  editNewsletter: (a: Actor) => has(a, "editNewsletter"),
  editCohort: (a: Actor, programme: Programme) => has(a, PROGRAMME_CAP[programme]),
  /** Listing and opening a project: its programme's exco, or the head of its lodge */
  seeProject: (a: Actor, p: ProjectRef) => has(a, PROGRAMME_CAP[p.programme]) || (p.programme === "AI Lodge" && headsLodge(a, p.lodgeId)),
  /** Lodge heads edit their lodge's drafts only: once submitted, AI Lodge exco or above takes over. */
  editProject: (a: Actor, p: ProjectRef) =>
    has(a, PROGRAMME_CAP[p.programme]) || (p.programme === "AI Lodge" && headsLodge(a, p.lodgeId) && (p.status ?? "draft") === "draft"),
  seeLodge: (a: Actor) => has(a, "seeLodge"),
  seeDap: (a: Actor) => has(a, "seeDap"),
  tracker: (a: Actor) => has(a, "tracker"),
};
