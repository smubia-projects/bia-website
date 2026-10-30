import { inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import { siteLinks } from "@/app/lib/db/schema";
import { DEFAULT_LINKS, EDITABLE_LINKS, type LinkKey, type SiteLinks } from "@/app/lib/links";
import { can, ensure, type Actor } from "./actor";
import { revalidateCms, TAGS } from "./revalidate";

const KEYS = EDITABLE_LINKS.map((l) => l.key);

/** Saved links over the defaults in app/lib/links.ts. */
export async function listSiteLinks(): Promise<SiteLinks> {
  const db = await getDb();
  const rows = await db.select().from(siteLinks);
  const links: SiteLinks = { ...DEFAULT_LINKS };
  for (const r of rows) if ((KEYS as string[]).includes(r.key) && r.url) links[r.key as LinkKey] = r.url;
  return links;
}

const readCached = unstable_cache(listSiteLinks, ["cms-site-links"], {
  revalidate: 3600,
  tags: [TAGS.links],
});

/** Every page reads this (navbar, footer, CTAs), so a failed read falls back to the defaults. */
export async function getSiteLinks(): Promise<SiteLinks> {
  try {
    return await readCached();
  } catch (error) {
    console.error("[cms] site links read failed", error);
    return { ...DEFAULT_LINKS };
  }
}

/** Saves the given links; an empty value restores the default. */
export async function saveSiteLinks(actor: Actor, input: Partial<Record<string, string>>): Promise<SiteLinks> {
  ensure(can.editLinks(actor), "Only exco can change site links");
  const db = await getDb();
  const entries = Object.entries(input).filter(([key]) => (KEYS as string[]).includes(key));
  ensure(entries.length > 0, "Nothing to save");
  const clear: string[] = [];
  for (const [key, raw] of entries) {
    const url = (raw ?? "").trim();
    const label = EDITABLE_LINKS.find((l) => l.key === key)!.label;
    if (!url || url === DEFAULT_LINKS[key as LinkKey]) {
      clear.push(key);
      continue;
    }
    ensure(/^https:\/\/\S+$/i.test(url), `${label} must be a full https:// link`);
    const values = { key, url, updatedAt: new Date().toISOString(), updatedBy: actor.email };
    await db.insert(siteLinks).values(values).onConflictDoUpdate({ target: siteLinks.key, set: values });
  }
  if (clear.length) await db.delete(siteLinks).where(inArray(siteLinks.key, clear));
  revalidateCms("links");
  return listSiteLinks();
}
