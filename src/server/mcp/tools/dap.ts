import "server-only";
import { z } from "zod";
import { CmsError } from "@/server/core/actor";
import * as cohorts from "@/server/cohorts/cohorts";
import * as newsletter from "@/server/dap/newsletter";
import { type McpServer, actor, tool } from "@/server/mcp/context";
import { issueFields } from "@/server/mcp/schemas";

export function registerDapTools(server: McpServer) {
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
            groupId: z.number().int().nullable().optional().describe("Co-learning group id from list_cohorts, or null"),
            slides: z.string().optional(),
          })
        ),
      }),
    },
    ({ cohortId, sessions }) => tool(() => newsletter.saveSessions(actor(), cohortId, sessions))
  );
}
