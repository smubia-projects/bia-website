"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SITE_PHOTOS, pickPhoto, type SitePhotos } from "@/app/lib/photos";

const SitePhotosContext = createContext<SitePhotos>(DEFAULT_SITE_PHOTOS);

/** Hands the CMS-edited photos (read once in the root layout) to client components. */
export function SitePhotosProvider({ photos, children }: { photos: SitePhotos; children: React.ReactNode }) {
  return <SitePhotosContext.Provider value={photos}>{children}</SitePhotosContext.Provider>;
}

/** The current photo for a slot in app/lib/photos.ts. */
export const usePhoto = (key: string) => pickPhoto(useContext(SitePhotosContext), key);
