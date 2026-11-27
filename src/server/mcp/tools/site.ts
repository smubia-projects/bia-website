import { z } from "zod";
import { can, CmsError } from "@/server/core/actor";
import { lodgeOptions } from "@/server/people/people";
import { listSiteLinks, saveSiteLinks } from "@/server/site/links";
import { listSitePhotos, saveSitePhoto } from "@/server/site/photos";
import { PHOTO_SLOTS, photoSite } from "@/shared/photos";
import { EDITABLE_LINKS } from "@/shared/links";
import { ROLE_LABEL, SUPERADMIN_LABEL } from "@/shared/taxonomy";
import { type McpServer, actor, tool } from "../context";

export function registerSiteTools(server: McpServer) {
  // ── Site links ──
  server.registerTool(
    "list_site_links",
    {
      title: "List site links",
      description: "The club links every page uses (application forms, Telegram, emails, prospectus, socials) and whether DAP / AI Lodge applications are open.",
      inputSchema: z.object({}),
    },
    () =>
      tool(async () => {
        const links = await listSiteLinks();
        return {
          links: EDITABLE_LINKS.map((l) => ({ key: l.key, label: l.label, group: l.group, usedFor: l.hint, value: links[l.key] })),
          applicationsOpen: links.applications,
        };
      })
  );

  server.registerTool(
    "update_site_links",
    {
      title: "Update site links",
      description:
        "Changes club links site-wide, keyed as in list_site_links (an empty string restores the default, or hides an optional button). applicationsOpen switches each programme's join buttons between its application form (open) and its Telegram (closed).",
      inputSchema: z.object({
        links: z.record(z.string(), z.string()).optional(),
        applicationsOpen: z.object({ dap: z.boolean().optional(), aiLodge: z.boolean().optional() }).optional(),
      }),
    },
    ({ links, applicationsOpen }) => tool(() => saveSiteLinks(actor(), { links, applications: applicationsOpen }))
  );

  // ── Photos ──
  server.registerTool(
    "list_photos",
    {
      title: "List site photos",
      description: "The photo slots you can change (smubia.com pages for exco; the AI Lodge site for exco and AI Lodge exco), with the current photo and whether it was replaced.",
      inputSchema: z.object({}),
    },
    () =>
      tool(async () => {
        const photos = await listSitePhotos();
        return PHOTO_SLOTS.filter((s) => can.editPhotos(actor(), photoSite(s.key))).map((s) => ({
          key: s.key,
          page: s.page,
          label: s.label,
          hint: s.hint,
          kind: s.kind,
          ratio: s.ratio,
          replaced: photos.custom.includes(s.key),
          current: s.kind === "gallery" ? photos.gallery[s.key] : photos.single[s.key],
        }));
      })
  );

  const photo = z.object({ src: z.string().describe("URL from upload_image"), alt: z.string().default("").describe("Describe the photo for screen readers") });
  server.registerTool(
    "set_photo",
    {
      title: "Replace or reset a site photo",
      description: "Replaces a slot from list_photos: one photo for a single slot, the whole ordered list for a gallery. reset puts the shipped photo back.",
      inputSchema: z.object({
        key: z.string(),
        photo: photo.optional(),
        photos: z.array(photo).optional().describe("Gallery slots"),
        reset: z.boolean().optional(),
      }),
    },
    ({ key, photo: one, photos: many, reset }) =>
      tool(async () => {
        const value = reset ? null : many ?? one;
        if (value === undefined) throw new CmsError("Pass photo, photos or reset");
        const saved = await saveSitePhoto(actor(), key, value);
        return { key, replaced: saved.custom.includes(key), current: saved.gallery[key] ?? saved.single[key] };
      })
  );

  server.registerTool(
    "whoami",
    { title: "Who am I", description: "The CMS account this token acts as, its role and (lodge heads) its lodges.", inputSchema: z.object({}) },
    () =>
      tool(async () => {
        const a = actor();
        const lodges = a.role === "lodge_head" ? await lodgeOptions(a.lodgeIds ?? []) : [];
        return {
          email: a.email,
          name: a.name,
          role: a.superadmin ? SUPERADMIN_LABEL : ROLE_LABEL[a.role],
          ...(a.role === "lodge_head" ? { lodges: lodges.map((l) => ({ id: l.id, name: l.name, semester: l.cohortName, cohortId: l.cohortId })) } : {}),
        };
      })
  );
}
