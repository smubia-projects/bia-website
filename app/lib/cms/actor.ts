import type { Programme, Role } from "./taxonomy";

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

export const can = {
  publishProject: (a: Actor) => a.role === "exco",
  setWinner: (a: Actor) => a.role === "exco",
  deleteProject: (a: Actor) => a.role === "exco",
  managePeople: (a: Actor) => a.role === "exco",
  editLinks: (a: Actor) => a.role === "exco",
  editNewsletter: (a: Actor) => a.role === "exco" || a.role === "dap_editor",
  editCohort: (a: Actor, programme: Programme) =>
    a.role === "exco" || (a.role === "dap_editor" && programme === "DAP"),
  editProject: (a: Actor, p: { programme: Programme }) =>
    a.role === "exco" || (a.role === "dap_editor" && p.programme === "DAP"),
  /** Which admin sections a role sees */
  seeLodge: (a: Actor) => a.role === "exco",
  seeDap: (a: Actor) => a.role === "exco" || a.role === "dap_editor",
};
