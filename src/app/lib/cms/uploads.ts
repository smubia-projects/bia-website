import { promises as fs } from "fs";
import path from "path";
import { put } from "@vercel/blob";
import { CmsError } from "./actor";

export const UPLOAD_FOLDERS = ["projects", "newsletter", "team", "lodges", "site"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"];
/** Lodge logos and animated art may be SVG. They are served from Vercel Blob's own domain. */
const SVG_FOLDERS: UploadFolder[] = ["lodges"];

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "image";
}

/**
 * Stores an image and returns its public URL. Uses Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set (same path convention as the Redis-era admin);
 * on localhost without a token it writes to public/uploads instead.
 */
export async function uploadImage(
  file: Blob,
  filename: string,
  folder: UploadFolder = "projects"
): Promise<string> {
  if (file.size === 0) throw new CmsError("The image is empty");
  if (file.size > MAX_BYTES) throw new CmsError("Images must be 8 MB or smaller");
  const svgOk = SVG_FOLDERS.includes(folder);
  if (file.type && !IMAGE_TYPES.includes(file.type) && !(svgOk && file.type === "image/svg+xml")) {
    throw new CmsError(`Only PNG, JPEG, WebP, GIF${svgOk ? ", SVG" : ""} or AVIF images can be uploaded`);
  }

  const pathname = `images/${folder}/${Date.now()}-${safeName(filename)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, file, { access: "public", addRandomSuffix: false });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new CmsError("Image uploads not configured. Set BLOB_READ_WRITE_TOKEN.");
  }

  const target = path.join(process.cwd(), "public", "uploads", pathname);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${pathname}`;
}

/** Fetches a remote image (e.g. a Devpost screenshot) and re-hosts it. */
export async function uploadImageFromUrl(url: string, folder: UploadFolder = "projects") {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new CmsError("Not a valid image URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new CmsError("Image URLs must be http(s)");
  }
  const res = await fetch(parsed, { redirect: "follow" });
  if (!res.ok) throw new CmsError(`Image download failed (HTTP ${res.status})`);
  const blob = await res.blob();
  const name = path.basename(parsed.pathname) || "image";
  return uploadImage(blob, name, folder);
}

/** Accepts a base64 string or data: URL (MCP clients sending local files). */
export async function uploadImageFromBase64(
  data: string,
  filename: string,
  folder: UploadFolder = "projects"
) {
  const match = data.match(/^data:([^;]+);base64,([\s\S]*)$/);
  const mime = match ? match[1] : guessMime(filename);
  const buffer = Buffer.from(match ? match[2] : data, "base64");
  return uploadImage(new Blob([buffer], { type: mime }), filename, folder);
}

function guessMime(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return (
    { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".svg": "image/svg+xml" }[ext] ??
    "image/png"
  );
}
