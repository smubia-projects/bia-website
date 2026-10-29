import { NextResponse } from "next/server";

/*
 * The Redis-era password login lived here. Sign-in is Google now; the path is
 * kept (see CLAUDE.md → URL Paths) and sends anyone who hits it to /admin/login.
 */
function toLogin(request: Request) {
  return NextResponse.redirect(new URL("/admin/login", request.url), 303);
}

export const GET = toLogin;
export const POST = toLogin;
