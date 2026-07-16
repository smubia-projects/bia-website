import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Canonicalises lowercase "/dap" requests to the real page at "/DAP".
 *
 * This is intentionally NOT a `next.config.mjs` redirect: redirect `source`
 * matching there is case-INsensitive, so a "/dap" -> "/DAP" rule also matches
 * "/DAP" itself and 308-redirects it back to "/DAP" forever (infinite loop).
 *
 * Here the check is an exact, case-sensitive comparison, so "/DAP" is left
 * untouched and only true case variants are redirected.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/DAP") {
    const url = request.nextUrl.clone();
    url.pathname = "/DAP";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  // Matcher is case-insensitive, so this catches "/dap", "/Dap", "/DAP", etc.
  // The case-sensitive guard above ensures "/DAP" passes straight through.
  matcher: ["/dap"],
};
