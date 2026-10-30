import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import { sitePhotos } from "@/app/lib/db/schema";
import { DEFAULT_SITE_PHOTOS, photoSlot, type Photo, type SitePhotos } from "@/app/lib/photos";
import { can, ensure, type Actor } from "./actor";
import { revalidateCms, TAGS } from "./revalidate";

/** The slot registry's defaults with every photo replaced in the CMS on top. */
export async function listSitePhotos(): Promise<SitePhotos> {
  const db = await getDb();
  const rows = await db.select().from(sitePhotos);
  const photos: SitePhotos = {
    single: { ...DEFAULT_SITE_PHOTOS.single },
    gallery: { ...DEFAULT_SITE_PHOTOS.gallery },
    custom: [],
  };
  for (const r of rows) {
    const slot = photoSlot(r.key);
    if (!slot) continue;
    if (slot.kind === "gallery" && Array.isArray(r.value)) photos.gallery[r.key] = r.value;
    else if (slot.kind === "single" && !Array.isArray(r.value)) photos.single[r.key] = r.value;
    else continue;
    photos.custom.push(r.key);
  }
  return photos;
}

const readCached = unstable_cache(listSitePhotos, ["cms-site-photos"], { revalidate: 3600, tags: [TAGS.photos] });

/** Read by the root layout, so a failed read falls back to the shipped photos. */
export async function getSitePhotos(): Promise<SitePhotos> {
  try {
    return await readCached();
  } catch (error) {
    console.error("[cms] site photos read failed", error);
    return DEFAULT_SITE_PHOTOS;
  }
}

function cleanPhoto(p: Photo, label: string): Photo {
  const src = (p.src ?? "").trim();
  ensure(src, `${label} needs a photo`);
  ensure(/^https:\/\/\S+$/i.test(src) || src.startsWith("/"), `${label} must be an uploaded image or an https:// link`);
  return { src, alt: (p.alt ?? "").trim() };
}

/** Replaces a slot's photo (or a gallery's list). `null` puts the shipped photo back. */
export async function saveSitePhoto(actor: Actor, key: string, value: Photo | Photo[] | null) {
  ensure(can.editPhotos(actor), "Only exco can change site photos");
  const slot = photoSlot(key);
  ensure(slot, "Unknown photo");
  const db = await getDb();
  if (value === null) {
    await db.delete(sitePhotos).where(eq(sitePhotos.key, key));
  } else {
    let clean: Photo | Photo[];
    if (slot.kind === "gallery") {
      ensure(Array.isArray(value), `${slot.label} takes a list of photos`);
      clean = value.map((p, i) => cleanPhoto(p, `Photo ${i + 1}`));
      ensure(clean.length > 0, `${slot.label} needs at least one photo`);
    } else {
      ensure(!Array.isArray(value), `${slot.label} takes one photo`);
      clean = cleanPhoto(value, slot.label);
    }
    const now = new Date().toISOString();
    await db
      .insert(sitePhotos)
      .values({ key, value: clean, updatedAt: now, updatedBy: actor.email })
      .onConflictDoUpdate({ target: sitePhotos.key, set: { value: clean, updatedAt: now, updatedBy: actor.email } });
  }
  revalidateCms("photos");
  return listSitePhotos();
}
