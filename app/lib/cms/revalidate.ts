import { revalidatePath, revalidateTag } from "next/cache";
import { after } from "next/server";

/** Cache tags for public reads; every CMS mutation busts the matching one. */
export const TAGS = {
  projects: "projects",
  cohorts: "cohorts",
  newsletter: "newsletter",
  links: "links",
  photos: "photos",
} as const;

type Tag = keyof typeof TAGS;

/** What the AI Lodge feed is built from (lodges and semesters, links, photos). */
const FEED_TAGS: Tag[] = ["cohorts", "links", "photos"];

/**
 * Outside a Next.js request (the Redis import script, tests) there is no cache
 * to bust and revalidateTag throws, so failures are ignored.
 */
export function revalidateCms(...tags: Tag[]) {
  try {
    // expire: 0 drops the entry now, so the next read (and the editor) sees the change
    for (const tag of tags) revalidateTag(TAGS[tag], { expire: 0 });
    if (tags.includes("links") || tags.includes("photos")) {
      // The navbar and footer read links, and photos reach client components
      // through the root layout, so every page changes.
      revalidatePath("/", "layout");
    } else if (tags.includes("projects")) {
      // The home page rail reads projects too.
      revalidatePath("/");
    }
    if (tags.some((t) => FEED_TAGS.includes(t))) after(notifyAiLodgeSite);
  } catch (error) {
    // Not in a request scope.
    console.warn("[cms] revalidate skipped:", error instanceof Error ? error.message : error);
  }
}

/**
 * Tells ailodge.smubia.com to rebuild its pages from the feed now instead of at
 * its hourly refresh. Runs after the response; a failed call only delays the
 * update until that refresh.
 */
async function notifyAiLodgeSite() {
  const url = process.env.AILODGE_REVALIDATE_URL;
  const secret = process.env.AILODGE_REVALIDATE_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) console.warn(`[cms] AI Lodge site revalidate answered ${res.status}`);
  } catch (error) {
    console.warn("[cms] AI Lodge site revalidate failed:", error instanceof Error ? error.message : error);
  }
}
