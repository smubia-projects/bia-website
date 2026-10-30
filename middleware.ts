import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalPath } from "@/app/lib/canonical-path";

/**
 * Canonical URLs are lower-case and kebab-case (/projects, /dap, /work-with-us).
 * Every older form redirects here in one 308 hop. Old paths are never removed,
 * only redirected (see CLAUDE.md → URL Paths).
 *
 * These live here rather than in `next.config.mjs` because redirect `source`
 * matching there is case-INsensitive: a "/DAP" -> "/dap" rule also matches
 * "/dap" itself and redirects it to itself forever. Matching here is exact.
 *
 * - Any path with capitals    -> lower-cased      (/DAP/newsletter, /Projects/ScamSense)
 * - /workwithus, /contactus   -> /work-with-us, /contact-us
 * - /projects/ai-lodge/...    -> /projects/ailodge/...
 * - /projects?badge=AI Lodge  -> /projects/ailodge   (old programme filter links)
 * - /projects?badge=DAP       -> /projects/dap
 *
 * Old project pages (/projects/<slug>) are not redirected: app/projects/[slug]
 * shows a "projects have moved" page that links to the new address.
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const target = canonicalPath(pathname, searchParams.get("badge"));
  const url = request.nextUrl.clone();
  url.searchParams.delete("badge");
  if (target === pathname && url.search === request.nextUrl.search) return NextResponse.next();
  url.pathname = target;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Matchers are case-sensitive and every match costs a middleware run, so
  // canonical lower-case pages never match. The first entry catches any page
  // path containing a capital letter (not _next, api or files with a dot).
  matcher: [
    "/((?!_next/|api/)(?!.*\\.)(?=.*[A-Z]).*)",
    "/workwithus",
    "/contactus",
    "/projects/ai-lodge",
    "/projects/ai-lodge/:path*",
    { source: "/projects", has: [{ type: "query", key: "badge" }] },
  ],
};
