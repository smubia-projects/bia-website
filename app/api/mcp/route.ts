import { timingSafeEqual } from "crypto";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { AGENT_ACTOR, CmsError } from "@/app/lib/cms/actor";
import * as cohorts from "@/app/lib/cms/cohorts";
import * as newsletter from "@/app/lib/cms/newsletter";
import * as projects from "@/app/lib/cms/projects";
import { listSiteLinks, saveSiteLinks } from "@/app/lib/cms/links";
import { projectPath } from "@/app/lib/cms/paths";
import { EDITABLE_LINKS } from "@/app/lib/links";
import { BLOCK_TYPES, BUILT_WITH, MADE_FOR, PROGRAMMES, PROJECT_STATUSES } from "@/app/lib/cms/taxonomy";
import { uploadImageFromBase64, uploadImageFromUrl } from "@/app/lib/cms/uploads";

/*
 * MCP server for the CMS, so Claude can manage site content from chat:
 *
 *   claude mcp add --transport http smubia-cms https://www.smubia.com/api/mcp \
 *     --header "Authorization: Bearer $CMS_MCP_TOKEN"
 *
 * Every tool goes through the same service layer as /admin (same validation,
 * one-winner-per-track rule, cache revalidation) and acts with exco rights as
 * "mcp-agent". Deleting is deliberately left to the admin UI.
 */

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
              lodges: c.programme === "AI Lodge" ? (await cohorts.listLodges(c.id)).map((l) => ({ id: l.id, name: l.name, url: l.url })) : undefined,
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
      (input) => tool(() => projects.createProject(AGENT_ACTOR, input))
    );

    server.registerTool(
      "update_project",
      {
        title: "Update project",
        description: "Updates only the fields you pass. Changing the title doesn't change the slug.",
        inputSchema: z.object({ slug: z.string(), ...projectFields }),
      },
      ({ slug, ...input }) => tool(() => projects.updateProject(AGENT_ACTOR, slug, input))
    );

    server.registerTool(
      "set_project_status",
      {
        title: "Set project status",
        description:
          "draft, in_review or published. Published projects appear on smubia.com immediately, at /projects/ailodge/<semester>/<slug> or /projects/dap/<cohort>/<slug>, so a project needs a cohortId before it can be published.",
        inputSchema: z.object({ slug: z.string(), status: z.enum(PROJECT_STATUSES) }),
      },
      ({ slug, status }) => tool(async () => (await projects.setProjectStatus(AGENT_ACTOR, slug, status), { slug, status }))
    );

    server.registerTool(
      "set_track_winner",
      {
        title: "Set Hack Day track winner",
        description: "Marks (or unmarks) an AI Lodge project as its track's winner. Each track has one winner; marking a new one replaces the old.",
        inputSchema: z.object({ slug: z.string(), winner: z.boolean() }),
      },
      ({ slug, winner }) => tool(async () => (await projects.setProjectWinner(AGENT_ACTOR, slug, winner), { slug, winner }))
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
          folder: z.enum(["projects", "newsletter", "team"]).default("projects"),
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
      ({ links, applicationsOpen }) => tool(() => saveSiteLinks(AGENT_ACTOR, { links, applications: applicationsOpen }))
    );

    // ── Cohorts ──
    server.registerTool(
      "create_cohort",
      {
        title: "Create cohort",
        description: "Adds an AI Lodge semester (slug like 'ay2627-s2') or a DAP cohort (slug like 'ay2627'). DAP cohorts start with a blank 10-week co-learning schedule. New cohorts are hidden until set live with update_cohort.",
        inputSchema: z.object({ programme: z.enum(PROGRAMMES), slug: z.string(), name: z.string() }),
      },
      (input) => tool(() => cohorts.createCohort(AGENT_ACTOR, input))
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
        }),
      },
      ({ id, ...input }) => tool(() => cohorts.updateCohort(AGENT_ACTOR, id, input))
    );

    server.registerTool(
      "save_track",
      {
        title: "Create or rename a Hack Day track",
        description: "Pass id to edit an existing track; omit it to add one to an AI Lodge semester. Tracks are the Hack Day categories (one winner each), separate from lodges.",
        inputSchema: z.object({ id: z.number().int().optional(), cohortId: z.string(), name: z.string(), letter: z.string().optional() }),
      },
      (input) => tool(() => cohorts.saveTrack(AGENT_ACTOR, input))
    );

    server.registerTool(
      "save_lodge",
      {
        title: "Create or edit a lodge",
        description: "A lodge in an AI Lodge semester: its name and the link to its page on ailodge.smubia.com (lodge head profiles live there). Pass id to edit.",
        inputSchema: z.object({ id: z.number().int().optional(), cohortId: z.string(), name: z.string(), url: z.string().optional() }),
      },
      (input) => tool(() => cohorts.saveLodge(AGENT_ACTOR, input))
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
      (input) => tool(() => cohorts.saveGroup(AGENT_ACTOR, input))
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
      ({ cohortId, week }) => tool(() => newsletter.createIssue(AGENT_ACTOR, cohortId, week))
    );

    server.registerTool(
      "update_issue",
      { title: "Update issue", description: "Updates only the fields you pass. Passing blocks replaces all sections.", inputSchema: z.object({ id: z.number().int(), ...issueFields }) },
      ({ id, ...input }) => tool(() => newsletter.updateIssue(AGENT_ACTOR, id, input))
    );

    server.registerTool(
      "publish_issue",
      {
        title: "Publish issue now",
        description: "Publishes immediately and, if the issue's postToTelegram is on, posts it once to the DAP Telegram channel.",
        inputSchema: z.object({ id: z.number().int() }),
      },
      ({ id }) => tool(async () => {
        const { issue, telegram } = await newsletter.publishIssue(AGENT_ACTOR, id);
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
      ({ id, date }) => tool(() => newsletter.scheduleIssue(AGENT_ACTOR, id, date))
    );

    server.registerTool(
      "send_issue_test",
      {
        title: "Send test to a Telegram user",
        description: "Sends the issue as the channel would see it to one Telegram user ID. That user must have sent /start to the bot first.",
        inputSchema: z.object({ id: z.number().int(), telegramUserId: z.string() }),
      },
      ({ id, telegramUserId }) => tool(() => newsletter.sendIssueTest(AGENT_ACTOR, id, telegramUserId))
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
      ({ cohortId, sessions }) => tool(() => newsletter.saveSessions(AGENT_ACTOR, cohortId, sessions))
    );
  },
  { serverInfo: { name: "smubia-cms", version: "1.0.0" } }
);

function authorised(request: Request) {
  const token = process.env.CMS_MCP_TOKEN;
  if (!token) {
    // Local development without a token is allowed; deployed sites need one.
    return process.env.NODE_ENV === "development";
  }
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function guarded(request: Request) {
  if (!authorised(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", "www-authenticate": 'Bearer realm="smubia-cms"' },
    });
  }
  // Buffer the (stateless, single-message) response so every tool finishes
  // inside this request: Next applies revalidateTag() calls only for work done
  // before the route handler returns, and a streamed body would run after it.
  const res = await handler(request);
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: res.headers });
}

export { guarded as GET, guarded as POST, guarded as DELETE };
