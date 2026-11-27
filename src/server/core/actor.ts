import "server-only";
import type { Role } from "@/shared/taxonomy";

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
