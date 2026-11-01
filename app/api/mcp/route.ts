import { AsyncLocalStorage } from "async_hooks";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { devLoginEnabled } from "@/auth";
import { can, CmsError, DEV_MCP_ACTOR, type Actor } from "@/app/lib/cms/actor";
import { getAILodgeFeed } from "@/app/lib/cms/ailodge-feed";
import * as cohorts from "@/app/lib/cms/cohorts";
import * as lodgesCms from "@/app/lib/cms/lodges";
import * as newsletter from "@/app/lib/cms/newsletter";
import * as projects from "@/app/lib/cms/projects";
import { listSiteLinks, saveSiteLinks, setApplicationsOpen } from "@/app/lib/cms/links";
import { listSitePhotos, saveSitePhoto } from "@/app/lib/cms/photos";
import { actorForToken } from "@/app/lib/cms/tokens";
import { PHOTO_SLOTS, photoSite } from "@/app/lib/photos";
import { projectPath } from "@/app/lib/cms/paths";
import { EDITABLE_LINKS } from "@/app/lib/links";
import {
  BLOCK_TYPES,
  BUILT_WITH,
  LODGE_AMBIENTS,
  LODGE_BELT_MODES,
  LODGE_BELT_SIZES,
  LODGE_BELT_SPEEDS,
  LODGE_EMBLEMS,
  LODGE_HERO_KINDS,
  LODGE_LOGO_STYLES,
  LODGE_NEON_SIGNS,
  LODGE_PARTICLES,
  LODGE_SHOWPIECES,
  MADE_FOR,
  PROGRAMMES,
  PROJECT_STATUSES,
  ROLE_LABEL,
} from "@/app/lib/cms/taxonomy";
import { uploadImageFromBase64, uploadImageFromUrl } from "@/app/lib/cms/uploads";

/*
 * MCP server for the CMS, so Claude can manage site content from chat. Each
 * person makes a personal access token in /admin (Settings › Access tokens):
 *
 *   claude mcp add --transport http smubia-cms https://www.smubia.com/api/mcp \
 *     --header "Authorization: Bearer smubia_pat_…"
 *
 * Every tool goes through the same service layer as /admin (same validation,
 * permissions, one-winner-per-track rule, cache revalidation) and acts as the
 * token's owner with their current role. Deleting is deliberately left to the admin UI.
 */

/** Who the current request acts as (set per request in guarded()). */
const requestActor = new AsyncLocalStorage<Actor>();
const actor = () => {
  const a = requestActor.getStore();
  if (!a) throw new CmsError("Not signed in");
  return a;
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

async function tool<T>(fn: () => Promise<T>) {
  try {
    return json(await fn());
  } catch (error) {
    const message = error instanceof CmsError ? error.message : error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
  }
}

const teamMember = z.object({
  name: z.string(),
  role: z.string().default(""),
  avatar: z.string().default(""),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});
const card = z.object({ icon: z.string().default("lightbulb"), title: z.string(), body: z.string() });

const projectFields = {
  title: z.string().optional(),
  description: z.string().max(400).optional().describe("Card description, ideally 200 characters or fewer"),
  programme: z.enum(PROGRAMMES).optional(),
  cohortId: z.string().nullable().optional().describe("From list_cohorts, e.g. ai-lodge-ay2627-s1"),
  trackId: z.number().int().nullable().optional().describe("Hack Day track id from list_cohorts (AI Lodge)"),
  lodgeId: z.number().int().nullable().optional().describe("Lodge id from list_cohorts (AI Lodge): the lodge the team was in"),
  madeFor: z.enum(MADE_FOR).or(z.literal("")).optional(),
  builtWith: z.enum(BUILT_WITH).or(z.literal("")).optional(),
  coverImage: z.string().optional().describe("URL from upload_image (16:10 works best)"),
  images: z.array(z.string()).optional().describe("Screenshot URLs from upload_image (16:9)"),
  overview: z.string().optional().describe("Markdown write-up shown as 'Project details'"),
  cards: z.array(card).optional(),
  team: z.array(teamMember).optional(),
  techStack: z.array(z.string()).optional(),
  liveUrl: z.string().optional(),
  sourceUrl: z.string().optional().describe("GitHub URL"),
};

const block = z.object({
  id: z.string().default(""),
  type: z.enum(BLOCK_TYPES),
  heading: z.string().default(""),
  body: z.string().default("").describe("Markdown, or the caption for Image blocks"),
  image: z.string().optional(),
});

const issueFields = {
  week: z.number().int().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  coverImage: z.string().optional(),
  blocks: z.array(block).optional(),
  postToTelegram: z.boolean().optional(),
};

const handler = createMcpHandler(
  (server) => {
    // ── Reference data ──
    server.registerTool(
      "list_cohorts",
      {
        title: "List cohorts and tracks",
        description:
          "AI Lodge semesters (with their Hack Day tracks and lodges) and DAP cohorts (with their teaching groups). Use the ids when placing projects or setting session groups.",
        inputSchema: z.object({}),
      },
      () =>
        tool(async () => {
          const all = await cohorts.listCohorts();
          return Promise.all(
            all.map(async (c) => ({
              id: c.id,
              programme: c.programme,
              slug: c.slug,
              name: c.name,
              visibility: c.visibility,
              tracks: c.programme === "AI Lodge" ? (await cohorts.listTracks(c.id)).map((t) => ({ id: t.id, name: t.name, projects: t.projectCount })) : undefined,
              lodges: c.programme === "AI Lodge" ? (await cohorts.listLodges(c.id)).map((l) => ({ id: l.id, slug: l.slug, name: l.name, status: l.status })) : undefined,
              groups: c.programme === "DAP" ? (await cohorts.listGroups(c.id)).map((g) => ({ id: g.id, name: g.name, members: g.members.length, mentors: g.mentors.length })) : undefined,
            }))
          );
        })
    );

    // ── Projects ──
    server.registerTool(
      "list_projects",
      {
        title: "List projects",
        description: "All projects (any status), optionally filtered.",
        inputSchema: z.object({
          programme: z.enum(PROGRAMMES).optional(),
          cohortId: z.string().optional(),
          status: z.enum(PROJECT_STATUSES).optional(),
          query: z.string().optional().describe("Matches title or description"),
        }),
      },
      ({ programme, cohortId, status, query }) =>
        tool(async () => {
          const q = query?.toLowerCase();
          return (await projects.listProjects())
            .filter((p) => (!programme || p.badge === programme) && (!cohortId || p.cohortId === cohortId) && (!status || p.status === status))
            .filter((p) => !q || `${p.title} ${p.description}`.toLowerCase().includes(q))
            .map((p) => ({ slug: p.slug, title: p.title, programme: p.badge, cohort: p.cohortName, track: p.trackName, status: p.status, winner: p.winner, madeFor: p.madeFor, builtWith: p.builtWith, path: p.cohortSlug ? projectPath(p) : null }));
        })
    );

    server.registerTool(
      "get_project",
      { title: "Get project", description: "Every field of one project.", inputSchema: z.object({ slug: z.string() }) },
      ({ slug }) => tool(async () => (await projects.getProject(slug)) ?? Promise.reject(new CmsError("Project not found")))
    );

    server.registerTool(
      "create_project",
      {
        title: "Create project",
        description: "Creates a project as a draft (status 'draft' unless 'in_review' is given). The slug comes from the title. Publish with set_project_status after a human has checked it.",
        inputSchema: z.object({ ...projectFields, title: z.string(), status: z.enum(["draft", "in_review"]).optional() }),
      },
      (input) => tool(() => projects.createProject(actor(), input))
    );

    server.registerTool(
      "update_project",
      {
        title: "Update project",
        description: "Updates only the fields you pass. Changing the title doesn't change the slug.",
        inputSchema: z.object({ slug: z.string(), ...projectFields }),
      },
      ({ slug, ...input }) => tool(() => projects.updateProject(actor(), slug, input))
    );

    server.registerTool(
      "set_project_status",
      {
        title: "Set project status",
        description:
          "draft, in_review or published. Published projects appear on smubia.com immediately, at /projects/ailodge/<semester>/<slug> or /projects/dap/<cohort>/<slug>, so a project needs a cohortId before it can be published.",
        inputSchema: z.object({ slug: z.string(), status: z.enum(PROJECT_STATUSES) }),
      },
      ({ slug, status }) => tool(async () => (await projects.setProjectStatus(actor(), slug, status), { slug, status }))
    );

    server.registerTool(
      "set_track_winner",
      {
        title: "Set Hack Day track winner",
        description: "Marks (or unmarks) an AI Lodge project as its track's winner. Each track has one winner; marking a new one replaces the old.",
        inputSchema: z.object({ slug: z.string(), winner: z.boolean() }),
      },
      ({ slug, winner }) => tool(async () => (await projects.setProjectWinner(actor(), slug, winner), { slug, winner }))
    );

    server.registerTool(
      "upload_image",
      {
        title: "Upload image",
        description: "Re-hosts an image on Vercel Blob and returns its URL. Pass either a public URL or base64 data (with a filename).",
        inputSchema: z.object({
          url: z.string().optional(),
          base64: z.string().optional(),
          filename: z.string().default("image.png"),
          folder: z.enum(["projects", "newsletter", "team", "lodges"]).default("projects").describe("lodges also accepts SVG (logos, animated art)"),
        }),
      },
      ({ url, base64, filename, folder }) =>
        tool(async () => {
          if (url) return { url: await uploadImageFromUrl(url, folder) };
          if (base64) return { url: await uploadImageFromBase64(base64, filename, folder) };
          throw new CmsError("Pass url or base64");
        })
    );

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

    // ── Cohorts ──
    server.registerTool(
      "create_cohort",
      {
        title: "Create cohort",
        description: "Adds an AI Lodge semester (slug like 'ay2627-s2') or a DAP cohort (slug like 'ay2627'). DAP cohorts start with a blank 10-week co-learning schedule. New cohorts are hidden until set live with update_cohort.",
        inputSchema: z.object({ programme: z.enum(PROGRAMMES), slug: z.string(), name: z.string() }),
      },
      (input) => tool(() => cohorts.createCohort(actor(), input))
    );

    server.registerTool(
      "update_cohort",
      {
        title: "Update cohort page",
        description: "Edits a semester/cohort page. Setting visibility 'live' archives the previously live one.",
        inputSchema: z.object({
          id: z.string(),
          name: z.string().optional(),
          visibility: z.enum(["live", "hidden", "archived"]).optional(),
          headline: z.string().optional(),
          writeup: z.string().optional().describe("Markdown"),
          hackDay: z.string().optional().describe("'Date · Venue'"),
          timeline: z
            .array(z.object({ label: z.string(), date: z.string().describe("YYYY-MM-DD"), note: z.string().optional(), deadline: z.boolean().optional() }))
            .optional()
            .describe("AI Lodge applications timeline shown on the AI Lodge site, e.g. Applications open, Deadline, Interviews. Mark the step applicants must act by with deadline."),
          shortName: z.string().optional().describe('AI Lodge: the AI Lodge site\'s name for the intake, e.g. "Fall 2026"'),
          revealNote: z.string().optional().describe('AI Lodge: read as "Details drop {revealNote}" on placeholder lodges, e.g. "soon" or "26 Oct"'),
        }),
      },
      ({ id, ...input }) => tool(() => cohorts.updateCohort(actor(), id, input))
    );

    server.registerTool(
      "save_track",
      {
        title: "Create or rename a Hack Day track",
        description: "Pass id to edit an existing track; omit it to add one to an AI Lodge semester. Tracks are the Hack Day categories (one winner each), separate from lodges.",
        inputSchema: z.object({ id: z.number().int().optional(), cohortId: z.string(), name: z.string(), letter: z.string().optional() }),
      },
      (input) => tool(() => cohorts.saveTrack(actor(), input))
    );

    server.registerTool(
      "get_lodge",
      { title: "Get lodge", description: "Everything about one AI Lodge lodge: copy, captains, weekly trail and art.", inputSchema: z.object({ id: z.number().int() }) },
      ({ id }) => tool(async () => (await lodgesCms.getLodge(id)) ?? Promise.reject(new CmsError("Lodge not found")))
    );

    const captain = z.object({
      name: z.string(),
      detail: z.string().default("").describe('School and year, e.g. "SCIS (IS) / Year 2"'),
      telegram: z.string().default("").describe("Handle without @"),
      image: z.string().default("").describe("URL from upload_image (square works best)"),
    });
    const week = z.object({
      label: z.string().describe('"Week 1", "Recess", "Weeks 5–8"'),
      topic: z.string(),
      tag: z.enum(["mandatory", "optional"]).optional(),
      note: z.string().optional(),
    });

    server.registerTool(
      "save_lodge",
      {
        title: "Create or edit a lodge",
        description:
          "A lodge in an AI Lodge semester, with everything the AI Lodge site (ailodge.smubia.com) shows: copy, captains (lodge heads), weekly trail, application status and art. Lodges are per semester: to reuse one, use copy_lodge. Pass id to edit; omitted fields stay as they are. The page lives at ailodge.smubia.com/lodges/<slug>.",
        inputSchema: z.object({
          id: z.number().int().optional(),
          cohortId: z.string().describe("The AI Lodge semester, e.g. ai-lodge-ay2627-s1"),
          name: z.string(),
          slug: z.string().optional().describe("URL name; defaults to the name without 'Lodge'"),
          oldSlugs: z.array(z.string()).optional().describe("Earlier URL names that redirect to this lodge, e.g. after a rename"),
          placeholder: z.boolean().optional().describe("Details not released yet: the site shows a 'details drop' card and the lodge takes no applications"),
          motto: z.string().optional().describe('Quoted line under the name, e.g. "Mostly Intelligent Together"'),
          tagline: z.string().optional(),
          level: z.string().optional().describe('Badge, e.g. "Open to all", "Beginner", "Intermediate"'),
          whoCanJoin: z.string().optional().describe('e.g. "Anyone"'),
          forWho: z.string().optional(),
          forWhoCard: z.string().optional().describe("Short version for the lodge card"),
          why: z.string().optional(),
          topics: z.array(z.string()).optional(),
          cardTags: z.array(z.string()).optional().describe("Up to 3 tags for the card; defaults to the first 3 topics"),
          goals: z.array(z.string()).optional(),
          schedule: z.string().optional().describe('"Tue or Wed evenings · 7–10pm"'),
          scheduleShort: z.string().optional().describe('For the card, e.g. "Tue · 7–10pm"'),
          scheduleTentative: z.boolean().optional(),
          sessionLength: z.string().optional(),
          weeks: z.array(week).optional(),
          trailTentative: z.boolean().optional().describe("The weekly topics are a draft"),
          weeksNote: z.string().optional(),
          captains: z.array(captain).optional(),
          status: z.enum(["open", "closed"]).optional().describe("Whether this lodge takes applications"),
          logo: z.string().optional().describe("Logo URL from upload_image (PNG, SVG or WebP on a transparent background)"),
          logoStyle: z.enum(LODGE_LOGO_STYLES).optional().describe("tint: the logo's shape painted in the glow colour (one-colour logos); original: its own colours"),
          emblem: z.enum(LODGE_EMBLEMS).optional().describe("Stand-in emblem while there is no logo"),
          accent: z.string().optional().describe("Hex colour, e.g. #3BB9AF"),
          neonColor: z.string().optional().describe("Hex glow colour; empty uses the accent"),
          neonSign: z.enum(LODGE_NEON_SIGNS).optional().describe("Coded neon sign: when set, the lodge's mark on its card and in a 'mark' strip"),
          hero: z
            .object({
              kind: z.enum(LODGE_HERO_KINDS).describe("logo, neon (the neonSign), showpiece (a coded one), custom (uploaded image with effects), animated (uploaded animated SVG)"),
              showpiece: z.enum(LODGE_SHOWPIECES).optional().describe("kind showpiece: despacito (retro sunset), bryan (night badge, fireflies), pandai (panda, leaves), spice (chilli, embers)"),
              image: z.string().optional().describe("kind custom or animated: URL from upload_image"),
              glow: z.string().optional().describe("kind custom: hex glow behind the image, empty for none"),
              particles: z.enum(LODGE_PARTICLES).optional().describe("kind custom"),
              float: z.boolean().optional().describe("kind custom: float and follow the pointer (default true)"),
            })
            .optional()
            .describe("The art beside the lodge's name at the top of its page"),
          belt: z
            .object({
              mode: z.enum(LODGE_BELT_MODES).optional().describe("mark: repeat the neon sign or logo; tile: repeat an image; banner: scroll one long seamless image; papel-picado: bunting; none"),
              image: z.string().optional().describe("tile or banner: URL from upload_image"),
              speed: z.enum(LODGE_BELT_SPEEDS).optional(),
              size: z.enum(LODGE_BELT_SIZES).optional(),
            })
            .optional()
            .describe("The strip that scrolls under the page's header; omitted parts stay as they are"),
          ambient: z.enum(LODGE_AMBIENTS).optional().describe("Particles drifting behind the page"),
          ambientImage: z.string().optional().describe("Custom drifting particle image URL; replaces the ambient preset"),
          ambientGlow: z.boolean().optional(),
        }),
      },
      (input) => tool(() => lodgesCms.saveLodge(actor(), input))
    );

    server.registerTool(
      "copy_lodge",
      {
        title: "Copy a lodge into another semester",
        description: "Copies a lodge (copy, captains, trail and art) into another AI Lodge semester, e.g. when a lodge runs again.",
        inputSchema: z.object({ id: z.number().int(), toCohortId: z.string() }),
      },
      ({ id, toCohortId }) => tool(() => lodgesCms.copyLodge(actor(), id, toCohortId))
    );

    server.registerTool(
      "set_lodge_applications",
      {
        title: "Open or close a lodge",
        description: "Whether one lodge takes applications. It only shows as open while AI Lodge applications are open too (set_applications_open).",
        inputSchema: z.object({ id: z.number().int(), open: z.boolean() }),
      },
      ({ id, open }) =>
        tool(async () => {
          const lodge = await lodgesCms.getLodge(id);
          if (!lodge) throw new CmsError("Lodge not found");
          const saved = await lodgesCms.saveLodge(actor(), { id, cohortId: lodge.cohortId, name: lodge.name, status: open ? "open" : "closed" });
          return { id, name: saved.name, status: saved.status };
        })
    );

    server.registerTool(
      "set_applications_open",
      {
        title: "Open or close a programme's applications",
        description: "Switches every join button for DAP or AI Lodge between its application form (open) and its Telegram (closed). AI Lodge exco can switch AI Lodge.",
        inputSchema: z.object({ programme: z.enum(PROGRAMMES), open: z.boolean() }),
      },
      ({ programme, open }) => tool(async () => ({ applicationsOpen: (await setApplicationsOpen(actor(), programme, open)).applications }))
    );

    server.registerTool(
      "get_ailodge_feed",
      {
        title: "Preview the AI Lodge feed",
        description: "Exactly what ailodge.smubia.com reads (GET /api/public/ailodge): the current or a given semester's lodges, past semesters, applications and replaced photos.",
        inputSchema: z.object({ semester: z.string().optional().describe("Semester slug, e.g. ay2627-s1; defaults to the current one") }),
      },
      ({ semester }) => tool(() => getAILodgeFeed(semester))
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
      { title: "Who am I", description: "The CMS account this token acts as and its role.", inputSchema: z.object({}) },
      () => tool(async () => ({ email: actor().email, name: actor().name, role: ROLE_LABEL[actor().role] }))
    );

    const profile = z.object({
      name: z.string(),
      image: z.string().optional().describe("URL from upload_image (square works best)"),
      linkedin: z.string().optional(),
      email: z.string().optional(),
      telegram: z.string().optional().describe("@handle or t.me link"),
    });

    server.registerTool(
      "get_dap_group",
      { title: "Get DAP group", description: "A DAP teaching group with its members and mentors.", inputSchema: z.object({ cohortId: z.string(), id: z.number().int() }) },
      ({ cohortId, id }) =>
        tool(async () => (await cohorts.listGroups(cohortId)).find((g) => g.id === id) ?? Promise.reject(new CmsError("Group not found")))
    );

    server.registerTool(
      "save_dap_group",
      {
        title: "Create or edit a DAP group",
        description:
          "A DAP cohort's teaching group. members and mentors (usually 1 to 3) replace the whole list when given. Pass id to edit; omit it to create.",
        inputSchema: z.object({
          id: z.number().int().optional(),
          cohortId: z.string(),
          name: z.string(),
          members: z.array(profile).optional(),
          mentors: z.array(profile).optional(),
        }),
      },
      (input) => tool(() => cohorts.saveGroup(actor(), input))
    );

    // ── DAP newsletter ──
    server.registerTool(
      "list_issues",
      {
        title: "List newsletter issues",
        description: "'This week in DAP' issues for a DAP cohort (defaults to the live one), with the co-learning schedule.",
        inputSchema: z.object({ cohortId: z.string().optional() }),
      },
      ({ cohortId }) =>
        tool(async () => {
          const id = cohortId ?? cohorts.pickCurrentCohort(await cohorts.listCohorts("DAP"))?.id;
          if (!id) throw new CmsError("There is no DAP cohort yet");
          const [issues, sessions] = await Promise.all([newsletter.listIssues(id), newsletter.listSessions(id)]);
          return { cohortId: id, issues: issues.map((i) => ({ id: i.id, week: i.week, title: i.title, status: i.status, publishAt: i.publishAt, publishedAt: i.publishedAt })), sessions };
        })
    );

    server.registerTool(
      "get_issue",
      { title: "Get issue", description: "Every field of one issue.", inputSchema: z.object({ id: z.number().int() }) },
      ({ id }) => tool(async () => (await newsletter.getIssue(id)) ?? Promise.reject(new CmsError("Issue not found")))
    );

    server.registerTool(
      "create_issue",
      {
        title: "Create issue",
        description: "Creates a draft issue for the next week (or the given week) with the default sections.",
        inputSchema: z.object({ cohortId: z.string(), week: z.number().int().optional() }),
      },
      ({ cohortId, week }) => tool(() => newsletter.createIssue(actor(), cohortId, week))
    );

    server.registerTool(
      "update_issue",
      { title: "Update issue", description: "Updates only the fields you pass. Passing blocks replaces all sections.", inputSchema: z.object({ id: z.number().int(), ...issueFields }) },
      ({ id, ...input }) => tool(() => newsletter.updateIssue(actor(), id, input))
    );

    server.registerTool(
      "publish_issue",
      {
        title: "Publish issue now",
        description: "Publishes immediately and, if the issue's postToTelegram is on, posts it once to the DAP Telegram channel.",
        inputSchema: z.object({ id: z.number().int() }),
      },
      ({ id }) => tool(async () => {
        const { issue, telegram } = await newsletter.publishIssue(actor(), id);
        return { id: issue.id, week: issue.week, status: issue.status, telegram };
      })
    );

    server.registerTool(
      "schedule_issue",
      {
        title: "Schedule issue",
        description: "Schedules for a date (YYYY-MM-DD). It goes out at about 9am SGT that day (±1 hour, daily cron).",
        inputSchema: z.object({ id: z.number().int(), date: z.string() }),
      },
      ({ id, date }) => tool(() => newsletter.scheduleIssue(actor(), id, date))
    );

    server.registerTool(
      "send_issue_test",
      {
        title: "Send test to a Telegram user",
        description: "Sends the issue as the channel would see it to one Telegram user ID. That user must have sent /start to the bot first.",
        inputSchema: z.object({ id: z.number().int(), telegramUserId: z.string() }),
      },
      ({ id, telegramUserId }) => tool(() => newsletter.sendIssueTest(actor(), id, telegramUserId))
    );

    server.registerTool(
      "update_sessions",
      {
        title: "Update co-learning schedule",
        description: "Upserts rows of a DAP cohort's co-learning schedule.",
        inputSchema: z.object({
          cohortId: z.string(),
          sessions: z.array(
            z.object({
              week: z.number().int(),
              topic: z.string().optional(),
              groupId: z.number().int().nullable().optional().describe("Teaching group id from list_cohorts, or null"),
              slides: z.string().optional(),
            })
          ),
        }),
      },
      ({ cohortId, sessions }) => tool(() => newsletter.saveSessions(actor(), cohortId, sessions))
    );
  },
  { serverInfo: { name: "smubia-cms", version: "1.0.0" } }
);

/**
 * The person a request acts as: the owner of its personal access token. Local
 * development (where the dev sign-in exists) also accepts no token, as exco.
 */
async function requestOwner(request: Request): Promise<Actor | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token) return actorForToken(token);
  return devLoginEnabled ? DEV_MCP_ACTOR : null;
}

async function guarded(request: Request) {
  const owner = await requestOwner(request);
  if (!owner) {
    return new Response(JSON.stringify({ error: "Unauthorized: use a personal access token from /admin/tokens" }), {
      status: 401,
      headers: { "content-type": "application/json", "www-authenticate": 'Bearer realm="smubia-cms"' },
    });
  }
  // Buffer the (stateless, single-message) response so every tool finishes
  // inside this request: Next applies revalidateTag() calls only for work done
  // before the route handler returns, and a streamed body would run after it.
  return requestActor.run(owner, async () => {
    const res = await handler(request);
    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: res.headers });
  });
}

export { guarded as GET, guarded as POST, guarded as DELETE };
