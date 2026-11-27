import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import { CmsError, type Actor } from "@/server/core/actor";
import type { createMcpHandler } from "mcp-handler";

/** The server each tool file registers its tools on. */
export type McpServer = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

/** Who the current request acts as (set per request in guarded()). */
export const requestActor = new AsyncLocalStorage<Actor>();
export const actor = () => {
  const a = requestActor.getStore();
  if (!a) throw new CmsError("Not signed in");
  return a;
};

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

export async function tool<T>(fn: () => Promise<T>) {
  try {
    return json(await fn());
  } catch (error) {
    const message = error instanceof CmsError ? error.message : error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
  }
}
