import "server-only";
import { z } from "zod";
import { CmsError } from "@/server/core/actor";
import { getAILodgeFeed } from "@/server/ailodge/feed";
import * as tracksCms from "@/server/ailodge/tracks";
import * as lodgesCms from "@/server/ailodge/lodges";
import { LODGE_AMBIENTS, LODGE_BELT_MODES, LODGE_BELT_SIZES, LODGE_BELT_SPEEDS, LODGE_EMBLEMS, LODGE_HERO_KINDS, LODGE_LOGO_STYLES, LODGE_NEON_SIGNS, LODGE_PARTICLES, LODGE_SHOWPIECES } from "@/shared/taxonomy";
import { type McpServer, actor, tool } from "@/server/mcp/context";

export function registerAILodgeTools(server: McpServer) {
  // ── AI Lodge: tracks, lodges and the public feed ──
  server.registerTool(
    "save_track",
    {
      title: "Create or rename a Hack Day track",
      description: "Pass id to edit an existing track; omit it to add one to an AI Lodge semester. Tracks are the Hack Day categories (one winner each), separate from lodges.",
      inputSchema: z.object({ id: z.number().int().optional(), cohortId: z.string(), name: z.string(), letter: z.string().optional() }),
    },
    (input) => tool(() => tracksCms.saveTrack(actor(), input))
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
    "get_ailodge_feed",
    {
      title: "Preview the AI Lodge feed",
      description: "Exactly what ailodge.smubia.com reads (GET /api/public/ailodge): the current or a given semester's lodges, past semesters, applications and replaced photos.",
      inputSchema: z.object({ semester: z.string().optional().describe("Semester slug, e.g. ay2627-s1; defaults to the current one") }),
    },
    ({ semester }) => tool(() => getAILodgeFeed(semester))
  );
}
