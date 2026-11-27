import { guarded } from "@/server/mcp/server";

/* The CMS's MCP endpoint (Claude's tools). The server, its tools and the token check are in src/server/mcp. */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export { guarded as GET, guarded as POST, guarded as DELETE };
