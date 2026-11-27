import "server-only";
import { z } from "zod";
import { can } from "@/server/core/permissions";
import * as cohorts from "@/server/cohorts/cohorts";
import * as tracksCms from "@/server/ailodge/tracks";
import * as colearningGroups from "@/server/dap/colearning-groups";
import * as lodgesCms from "@/server/ailodge/lodges";
import { setApplicationsOpen } from "@/server/site/links";
import { PROGRAMMES, LODGE_HEAD_ACCESS_WEEKS } from "@/shared/taxonomy";
import { type McpServer, actor, tool } from "@/server/mcp/context";

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
            tracks: c.programme === "AI Lodge" ? (await tracksCms.listTracks(c.id)).map((t) => ({ id: t.id, name: t.name, projects: t.projectCount })) : undefined,
            lodges:
              c.programme === "AI Lodge"
                ? (await lodgesCms.listLodges(c.id))
                    .filter((l) => a.role !== "lodge_head" || a.lodgeIds?.includes(l.id))
                    .map((l) => ({ id: l.id, slug: l.slug, name: l.name, status: l.status }))
                : undefined,
            groups: c.programme === "DAP" ? (await colearningGroups.listGroups(c.id)).map((g) => ({ id: g.id, name: g.name, members: g.members.length, mentors: g.mentors.length })) : undefined,
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
    "set_applications_open",
    {
      title: "Open or close a programme's applications",
      description: "Switches every join button for DAP or AI Lodge between its application form (open) and its Telegram (closed). AI Lodge exco can switch AI Lodge.",
      inputSchema: z.object({ programme: z.enum(PROGRAMMES), open: z.boolean() }),
    },
    ({ programme, open }) => tool(async () => ({ applicationsOpen: (await setApplicationsOpen(actor(), programme, open)).applications }))
  );

}
