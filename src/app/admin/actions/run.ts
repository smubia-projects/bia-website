/*
 * Shared by the admin server actions in this folder: every action re-checks the session through
 * run() and turns CmsErrors into editor-facing messages. Not a "use server" file, so these
 * helpers are never exposed as actions themselves.
 */

import { revalidatePath } from "next/cache";
import { CmsError, type Actor } from "@/server/core/actor";
import { requireActor } from "@/server/auth/session";
import * as tracker from "@/server/dap/tracker/service";

export type ActionResult<T = null> = { ok: true; data: T; message?: string } | { ok: false; error: string };

/** Every action re-checks the session and turns CmsErrors into editor-facing messages. */
export async function run<T>(fn: (actor: Actor) => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    const actor = await requireActor();
    const data = await fn(actor);
    return { ok: true, data, message };
  } catch (error) {
    if (error instanceof CmsError) return { ok: false, error: error.message };
    console.error("[cms action]", error);
    return { ok: false, error: "Action failed. Retry, and check the server logs if the error persists." };
  }
}

export const refreshAdmin = () => revalidatePath("/admin", "layout");

/** Runs a tracker change as an admin and refreshes the dashboard. */
export const track = <T,>(fn: (actor: Actor, who: tracker.TrackerWho) => Promise<T>, message?: string) =>
  run(async (actor) => {
    const data = await fn(actor, tracker.adminWho(actor));
    refreshAdmin();
    return data;
  }, message);
