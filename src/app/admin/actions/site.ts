"use server";

import { CmsError } from "@/server/core/actor";
import { saveSiteLinks, setApplicationsOpen, type SiteLinksInput } from "@/server/site/links";
import { saveSitePhoto } from "@/server/site/photos";
import type { Photo } from "@/shared/photos";
import { UPLOAD_FOLDERS, uploadImage, type UploadFolder } from "@/server/integrations/blob/uploads";
import type { Programme } from "@/shared/taxonomy";
import { type ActionResult, run, refreshAdmin } from "./run";

export async function uploadImageAction(formData: FormData): Promise<ActionResult<string>> {
  return run(async () => {
    const file = formData.get("file");
    const folder = (formData.get("folder") as UploadFolder) || "projects";
    if (!UPLOAD_FOLDERS.includes(folder)) throw new CmsError("Unknown upload folder");
    if (!(file instanceof Blob)) throw new CmsError("No image received");
    const name = (formData.get("name") as string) || (file instanceof File ? file.name : "image.jpg");
    return uploadImage(file, name, folder);
  });
}

/** Replaces a site photo (or a gallery's list); null puts the original back. */
export async function saveSitePhotoAction(key: string, value: Photo | Photo[] | null) {
  return run(async (actor) => {
    await saveSitePhoto(actor, key, value);
    refreshAdmin();
    return null;
  });
}

export async function setApplicationsOpenAction(programme: Programme, open: boolean) {
  return run(async (actor) => {
    await setApplicationsOpen(actor, programme, open);
    refreshAdmin();
    return null;
  }, open ? `${programme} applications are open` : `${programme} applications are closed`);
}

export async function saveSiteLinksAction(input: SiteLinksInput) {
  return run(async (actor) => {
    await saveSiteLinks(actor, input);
    refreshAdmin();
    return null;
  }, "Saved");
}
