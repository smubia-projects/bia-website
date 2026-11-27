"use client";

import { createContext, useContext } from "react";
import { DEFAULT_SITE_LINKS, type SiteLinks } from "@/app/lib/links";

const SiteLinksContext = createContext<SiteLinks>(DEFAULT_SITE_LINKS);

/** Hands the CMS-edited links (read once in the root layout) to client components. */
export function SiteLinksProvider({ links, children }: { links: SiteLinks; children: React.ReactNode }) {
  return <SiteLinksContext.Provider value={links}>{children}</SiteLinksContext.Provider>;
}

export const useSiteLinks = () => useContext(SiteLinksContext);
