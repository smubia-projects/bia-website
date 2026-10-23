import { unstable_cache } from "next/cache";
import { Redis } from "@upstash/redis";
import { put } from "@vercel/blob";
import { Project } from "@/app/Projects/data/types";

const redis = Redis.fromEnv();
// Client for the cached public reads below. Its default `cache: "no-store"`
// makes Next abort static rendering even inside unstable_cache; "no-cache"
// still skips Next's fetch cache, leaving unstable_cache as the only layer.
const publicRedis = Redis.fromEnv({ cache: "no-cache" });

const INDEX_KEY = "projects:index";
const projectKey = (slug: string) => `project:${slug}`;

/** Cache tag for the public project reads; admin mutations revalidate it. */
export const PROJECTS_TAG = "projects";
const PUBLIC_REVALIDATE_SECONDS = 3600;

export async function getProjects(): Promise<Project[]> {
  try {
    const slugs = await redis.lrange<string>(INDEX_KEY, 0, -1);
    if (!slugs || slugs.length === 0) return [];

    const keys = slugs.map(projectKey);
    const results = await redis.mget<(Project | null)[]>(...keys);
    return results.filter((p): p is Project => p !== null);
  } catch {
    return [];
  }
}

export async function getProject(slug: string): Promise<Project | null> {
  try {
    return await redis.get<Project>(projectKey(slug));
  } catch {
    return null;
  }
}

/*
 * Public pages read through Next's data cache. The Upstash client fetches with
 * `cache: "no-store"`, which would otherwise force every page that touches
 * Redis into per-request server rendering (no static HTML, no CDN cache, a
 * Redis round trip on every navigation). Errors are thrown inside the cached
 * function so a failed read is never cached, then swallowed outside it.
 * The admin panel keeps using the uncached reads above.
 */
const readProjectsCached = unstable_cache(
  async (): Promise<Project[]> => {
    const slugs = await publicRedis.lrange<string>(INDEX_KEY, 0, -1);
    if (!slugs || slugs.length === 0) return [];
    const results = await publicRedis.mget<(Project | null)[]>(
      ...slugs.map(projectKey)
    );
    return results.filter((p): p is Project => p !== null);
  },
  ["public-projects"],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [PROJECTS_TAG] }
);

const readProjectCached = unstable_cache(
  async (slug: string): Promise<Project | null> =>
    publicRedis.get<Project>(projectKey(slug)),
  ["public-project"],
  { revalidate: PUBLIC_REVALIDATE_SECONDS, tags: [PROJECTS_TAG] }
);

export async function getPublicProjects(): Promise<Project[]> {
  try {
    return await readProjectsCached();
  } catch (error) {
    console.error("[projects] public list read failed", error);
    return [];
  }
}

export async function getPublicProject(slug: string): Promise<Project | null> {
  try {
    return await readProjectCached(slug);
  } catch (error) {
    console.error(`[projects] public read failed for "${slug}"`, error);
    return null;
  }
}

export async function saveProject(project: Project): Promise<void> {
  const slugs = await redis.lrange<string>(INDEX_KEY, 0, -1);
  const exists = slugs.includes(project.slug);

  const pipeline = redis.pipeline();
  pipeline.set(projectKey(project.slug), project);
  if (!exists) {
    pipeline.rpush(INDEX_KEY, project.slug);
  }
  await pipeline.exec();
}

export async function deleteProjectBySlug(slug: string): Promise<boolean> {
  const removed = await redis.lrem(INDEX_KEY, 0, slug);
  if (removed === 0) return false;
  await redis.del(projectKey(slug));
  return true;
}

export async function uploadImage(file: File): Promise<string> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `images/projects/${timestamp}-${safeName}`;
  const blob = await put(pathname, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return blob.url;
}
