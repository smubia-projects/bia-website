import { NextResponse } from "next/server";
import { getAILodgeFeed } from "@/app/lib/cms/ailodge-feed";

/**
 * GET /api/public/ailodge[?semester=<slug>]
 * Public, read-only data for the AI Lodge site: the current semester's lodges,
 * past semesters, the applications switch and links. No auth; nothing private
 * is in it. Contract: docs/ailodge-site-handoff.md.
 */
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export async function GET(request: Request) {
  const semester = new URL(request.url).searchParams.get("semester")?.toLowerCase() || undefined;
  try {
    const feed = await getAILodgeFeed(semester);
    if (semester && !feed.semester) {
      return NextResponse.json({ error: `No public AI Lodge semester "${semester}"` }, { status: 404, headers: CORS });
    }
    return NextResponse.json(feed, {
      headers: { ...CORS, "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("[api] AI Lodge feed failed", error);
    return NextResponse.json({ error: "The AI Lodge feed is unavailable" }, { status: 503, headers: CORS });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
