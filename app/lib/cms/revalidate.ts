import { revalidatePath, revalidateTag } from "next/cache";

/** Cache tags for public reads; every CMS mutation busts the matching one. */
export const TAGS = {
  projects: "projects",
  cohorts: "cohorts",
  newsletter: "newsletter",
} as const;

type Tag = keyof typeof TAGS;

/**
 * Outside a Next.js request (the Redis import script, tests) there is no cache
 * to bust and revalidateTag throws, so failures are ignored.
 */
export function revalidateCms(...tags: Tag[]) {
  try {
    for (const tag of tags) revalidateTag(TAGS[tag]);
    if (tags.includes("projects")) {
      // The home page rail reads projects too.
      revalidatePath("/");
    }
  } catch (error) {
    // Not in a request scope.
    console.warn("[cms] revalidate skipped:", error instanceof Error ? error.message : error);
  }
}
