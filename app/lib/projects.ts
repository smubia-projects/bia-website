import { put, list, del } from "@vercel/blob";
import { Project } from "@/app/Projects/data/types";

const PROJECTS_KEY = "data/projects.json";

export async function getProjects(): Promise<Project[]> {
  try {
    const { blobs } = await list({ prefix: PROJECTS_KEY, limit: 1 });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function saveProjects(projects: Project[]): Promise<void> {
  const { blobs } = await list({ prefix: PROJECTS_KEY, limit: 1 });
  if (blobs.length > 0) {
    await del(blobs[0].url);
  }
  await put(PROJECTS_KEY, JSON.stringify(projects, null, 2), {
    access: "public",
    addRandomSuffix: false,
  });
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
