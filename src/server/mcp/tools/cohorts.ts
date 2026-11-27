import { z } from "zod";
import { CmsError } from "@/server/core/actor";
import { can } from "@/server/core/permissions";
import { getAILodgeFeed } from "@/server/ailodge/feed";
import * as cohorts from "@/server/cohorts/cohorts";
import * as lodgesCms from "@/server/ailodge/lodges";
import { setApplicationsOpen } from "@/server/site/links";
import {
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
  PROGRAMMES,
  LODGE_HEAD_ACCESS_WEEKS,
} from "@/shared/taxonomy";
import { type McpServer, actor, tool } from "../context";

export function registerCohortsTools(server: McpServer) {
  // ── Reference data ──
  server.registerTool(
    "list_cohorts",
    {
      title: "List cohorts and tracks",
      description:
        "AI Lodge semesters (with their Hack Day tracks and lodges) and DAP cohorts (with their co-learning groups, which are separate from project teams). Use the ids when placing projects or setting session groups.",
      inputSchema: z.object({}),
    },
    () =>
      tool(async () => {
        const a = actor();
        const mine = new Set(a.role === "lodge_head" ? (await lodgesCms.listAllLodges()).filter((l) => a.lodgeIds?.includes(l.id)).map((l) => l.cohortId) : []);
        const all = (await cohorts.listCohorts()).filter((c) => (a.role === "lodge_head" ? mine.has(c.id) : can.editCohort(a, c.programme)));
        return Promise.all(
          all.map(async (c) => ({
            id: c.id,
            programme: c.programme,
            slug: c.slug,
            name: c.name,
            visibility: c.visibility,
            startsOn: c.programme === "AI Lodge" ? c.startsOn : undefined,
            tracks: c.programme === "AI Lodge" ? (await cohorts.listTracks(c.id)).map((t) => ({ id: t.id, name: t.name, projects: t.projectCount })) : undefined,
            lodges:
              c.programme === "AI Lodge"
                ? (await cohorts.listLodges(c.id))
                    .filter((l) => a.role !== "lodge_head" || a.lodgeIds?.includes(l.id))
                    .map((l) => ({ id: l.id, slug: l.slug, name: l.name, status: l.status }))
                : undefined,
            groups: c.programme === "DAP" ? (await cohorts.listGroups(c.id)).map((g) => ({ id: g.id, name: g.name, members: g.members.length, mentors: g.mentors.length })) : undefined,
          }))
        );
      })
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
        startsOn: z
          .string()
          .nullable()
          .optional()
          .describe(`AI Lodge: first day of week 1 (YYYY-MM-DD). Lodge heads' access ends ${LODGE_HEAD_ACCESS_WEEKS} weeks after it by default.`),
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
}
