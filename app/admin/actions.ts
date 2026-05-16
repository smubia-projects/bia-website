"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { getProjects, saveProjects, uploadImage } from "@/app/lib/projects";
import { Project } from "@/app/Projects/data/types";

const COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function checkAuth(): boolean {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;

    const [timestamp, hmac] = token.split(".");
    if (!timestamp || !hmac) return false;

    const secret = process.env.ADMIN_PASSWORD;
    if (!secret) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > SESSION_MAX_AGE || age < 0) return false;

    const expected = createHmac("sha256", secret)
      .update(timestamp)
      .digest("hex");
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function logout(): Promise<{ done: boolean }> {
  cookies().delete(COOKIE_NAME);
  return { done: true };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function processImages(formData: FormData): Promise<{
  coverImage: string;
  images: string[];
}> {
  const coverFile = formData.get("coverImage") as File | null;
  const existingCover = formData.get("existingCoverImage") as string;
  let coverImage = existingCover || "";

  if (coverFile && coverFile.size > 0) {
    coverImage = await uploadImage(coverFile);
  }

  const imageFiles = formData.getAll("images") as File[];
  const existingImages = formData.get("existingImages") as string;
  let images: string[] = existingImages ? JSON.parse(existingImages) : [];

  const newImages = await Promise.all(
    imageFiles
      .filter((f) => f.size > 0)
      .map((f) => uploadImage(f))
  );
  if (newImages.length > 0) {
    images = [...images, ...newImages];
  }

  if (images.length === 0 && coverImage) {
    images = [coverImage];
  }

  return { coverImage, images };
}

function parseTeam(
  formData: FormData
): { name: string; role: string; avatar: string }[] {
  const teamJson = formData.get("team") as string;
  if (!teamJson) return [];
  try {
    return JSON.parse(teamJson);
  } catch {
    return [];
  }
}

function parseTechStack(formData: FormData): string[] {
  const raw = formData.get("techStack") as string;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function addProject(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  if (!checkAuth()) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const title = (formData.get("title") as string) || "";
    const slug = slugify(title);
    if (!slug) return { success: false, error: "Title is required" };

    const projects = await getProjects();
    if (projects.some((p) => p.slug === slug)) {
      return {
        success: false,
        error: "A project with this title already exists",
      };
    }

    const { coverImage, images } = await processImages(formData);
    const badge = (formData.get("badge") as "DAP" | "AI Lodge") || "DAP";

    const project: Project = {
      slug,
      title,
      description: (formData.get("description") as string) || "",
      badge,
      category: (formData.get("category") as string) || "",
      coverImage,
      images,
      overview: (formData.get("overview") as string) || "",
      rationale: (formData.get("rationale") as string) || "",
      lessons: {
        satisfaction: (formData.get("satisfaction") as string) || "",
        takeaway: (formData.get("takeaway") as string) || "",
      },
      team: parseTeam(formData),
      programme: badge,
      status:
        (formData.get("status") as "Completed" | "Ongoing") || "Completed",
      techStack: parseTechStack(formData),
      demoUrl: (formData.get("demoUrl") as string) || undefined,
      sourceUrl: (formData.get("sourceUrl") as string) || undefined,
    };

    projects.push(project);
    await saveProjects(projects);
    revalidatePath("/Projects");
    revalidatePath("/Projects/" + slug);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateProject(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  if (!checkAuth()) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const slug = formData.get("slug") as string;
    if (!slug) return { success: false, error: "Project slug is required" };

    const projects = await getProjects();
    const idx = projects.findIndex((p) => p.slug === slug);
    if (idx === -1) return { success: false, error: "Project not found" };

    const { coverImage, images } = await processImages(formData);
    const badge = (formData.get("badge") as "DAP" | "AI Lodge") || "DAP";

    projects[idx] = {
      ...projects[idx],
      title: (formData.get("title") as string) || projects[idx].title,
      description:
        (formData.get("description") as string) || projects[idx].description,
      badge,
      category: (formData.get("category") as string) || projects[idx].category,
      coverImage: coverImage || projects[idx].coverImage,
      images: images.length > 0 ? images : projects[idx].images,
      overview: (formData.get("overview") as string) || projects[idx].overview,
      rationale:
        (formData.get("rationale") as string) || projects[idx].rationale,
      lessons: {
        satisfaction:
          (formData.get("satisfaction") as string) ||
          projects[idx].lessons.satisfaction,
        takeaway:
          (formData.get("takeaway") as string) ||
          projects[idx].lessons.takeaway,
      },
      team: parseTeam(formData),
      programme: badge,
      status:
        (formData.get("status") as "Completed" | "Ongoing") ||
        projects[idx].status,
      techStack: parseTechStack(formData),
      demoUrl: (formData.get("demoUrl") as string) || undefined,
      sourceUrl: (formData.get("sourceUrl") as string) || undefined,
    };

    await saveProjects(projects);
    revalidatePath("/Projects");
    revalidatePath("/Projects/" + slug);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteProject(
  slug: string
): Promise<{ success: boolean; error?: string }> {
  if (!checkAuth()) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const projects = await getProjects();
    const filtered = projects.filter((p) => p.slug !== slug);
    if (filtered.length === projects.length) {
      return { success: false, error: "Project not found" };
    }

    await saveProjects(filtered);
    revalidatePath("/Projects");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function fetchProjects(): Promise<Project[]> {
  if (!checkAuth()) return [];
  return getProjects();
}
