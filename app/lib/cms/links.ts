import { eq, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import { siteLinks, siteSettings } from "@/app/lib/db/schema";
import {
  DEFAULT_APPLICATIONS,
  DEFAULT_LINKS,
  DEFAULT_SITE_LINKS,
  EDITABLE_LINKS,
  type Applications,
  type LinkKey,
  type SiteLinks,
} from "@/app/lib/links";
import { can, ensure, type Actor } from "./actor";
import { revalidateCms, TAGS } from "./revalidate";
import type { Programme } from "./taxonomy";

const KEYS = EDITABLE_LINKS.map((l) => l.key) as string[];

/** Saved links and switches over the defaults in app/lib/links.ts. */
export async function listSiteLinks(): Promise<SiteLinks> {
  const db = await getDb();
  const [rows, [apps]] = await Promise.all([
    db.select().from(siteLinks),
    db.select().from(siteSettings).where(eq(siteSettings.key, "applications")),
  ]);
  const links: SiteLinks = { ...DEFAULT_LINKS, applications: { ...DEFAULT_APPLICATIONS } };
  // An optional link saved as "" means "hide the button", so empty values count too.
  for (const r of rows) if (KEYS.includes(r.key)) links[r.key as LinkKey] = r.url;
  if (apps) links.applications = { ...DEFAULT_APPLICATIONS, ...(apps.value as Partial<Applications>) };
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
    return { ...DEFAULT_SITE_LINKS };
  }
}

export interface SiteLinksInput {
  links?: Partial<Record<string, string>>;
  applications?: Partial<Applications>;
}

/** Opens or closes one programme's applications (every join button follows). */
export async function setApplicationsOpen(actor: Actor, programme: Programme, open: boolean): Promise<SiteLinks> {
  ensure(can.setApplications(actor, programme), `This role cannot open or close ${programme} applications`);
  const db = await getDb();
  const current = (await listSiteLinks()).applications;
  const value: Applications = { ...current, [programme === "DAP" ? "dap" : "aiLodge"]: Boolean(open) };
  const row = { key: "applications", value, updatedAt: new Date().toISOString(), updatedBy: actor.email };
  await db.insert(siteSettings).values(row).onConflictDoUpdate({ target: siteSettings.key, set: row });
  revalidateCms("links");
  return listSiteLinks();
}

/** Saves links (a value equal to the default clears the override) and the applications switches. */
export async function saveSiteLinks(actor: Actor, input: SiteLinksInput): Promise<SiteLinks> {
  ensure(can.editLinks(actor), "Editing site links requires the exco admin role");
  const db = await getDb();
  const now = new Date().toISOString();
  const entries = Object.entries(input.links ?? {}).filter(([key]) => KEYS.includes(key));
  const clear: string[] = [];
  for (const [key, raw] of entries) {
    const field = EDITABLE_LINKS.find((l) => l.key === key)!;
    const value = (raw ?? "").trim();
    // Back to the default: the same value, or a required link left empty.
    if (value === DEFAULT_LINKS[key as LinkKey] || (!value && !field.optional)) {
      clear.push(key);
      continue;
    }
    if (field.type === "email") {
      ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), `${field.label} must be an email address`);
    } else if (value || !field.optional) {
      ensure(/^https:\/\/\S+$/i.test(value), `${field.label} must be a full https:// link`);
    }
    const row = { key, url: value, updatedAt: now, updatedBy: actor.email };
    await db.insert(siteLinks).values(row).onConflictDoUpdate({ target: siteLinks.key, set: row });
  }
  if (clear.length) await db.delete(siteLinks).where(inArray(siteLinks.key, clear));

  if (input.applications) {
    const current = (await listSiteLinks()).applications;
    const value: Applications = {
      dap: input.applications.dap ?? current.dap,
      aiLodge: input.applications.aiLodge ?? current.aiLodge,
    };
    const row = { key: "applications", value, updatedAt: now, updatedBy: actor.email };
    await db.insert(siteSettings).values(row).onConflictDoUpdate({ target: siteSettings.key, set: row });
  }
  revalidateCms("links");
  return listSiteLinks();
}
