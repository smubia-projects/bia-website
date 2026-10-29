import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * URL canonicalisation and legacy redirects. Old paths are never removed,
 * only redirected (see CLAUDE.md → URL Paths).
 *
 * These live here rather than in `next.config.mjs` because redirect `source`
 * matching there is case-INsensitive: a "/dap" -> "/DAP" rule also matches
 * "/DAP" itself and 308-redirects it back to "/DAP" forever. Comparisons here
 * are exact and case-sensitive, so canonical URLs pass straight through.
 *
 * - /dap, /Dap/...           -> /DAP/...        (top segment upper-cased, rest lower-case)
 * - /projects, /PROJECTS/... -> /Projects/...
 * - /Projects?badge=AI Lodge -> /Projects/ai-lodge   (old programme filter links)
 * - /Projects?badge=DAP      -> /DAP/projects
 * - /Projects/dap            -> /DAP/projects
 */
const CANONICAL_TOP: Record<string, string> = { dap: "DAP", projects: "Projects" };

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const [, top = "", ...rest] = pathname.split("/");
  const canonicalTop = CANONICAL_TOP[top.toLowerCase()];
  if (!canonicalTop) return NextResponse.next();

  const restPath = rest.map((s) => s.toLowerCase()).join("/");
  let target = `/${canonicalTop}${restPath ? `/${restPath}` : ""}`.replace(/\/+$/, "");

  if (target === "/Projects/dap") target = "/DAP/projects";

  const url = request.nextUrl.clone();
  if (target === "/Projects" && searchParams.has("badge")) {
    const badge = (searchParams.get("badge") ?? "").toLowerCase();
    url.searchParams.delete("badge");
    if (badge === "ai lodge" || badge === "ai-lodge") target = "/Projects/ai-lodge";
    else if (badge === "dap") target = "/DAP/projects";
  }

  if (target === pathname && url.search === request.nextUrl.search) {
    return NextResponse.next();
  }
  url.pathname = target;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Matchers are case-sensitive and every match costs a middleware run, so
  // canonical pages (/DAP, /Projects/...) are only matched where a redirect
  // can apply: lower/title-case variants, the old ?badge= links and /Projects/dap.
  matcher: [
    "/dap",
    "/dap/:path*",
    "/Dap",
    "/Dap/:path*",
    "/projects",
    "/projects/:path*",
    "/Projects/dap",
    { source: "/Projects", has: [{ type: "query", key: "badge" }] },
  ],
};
