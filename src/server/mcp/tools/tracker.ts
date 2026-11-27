import "server-only";
import { z } from "zod";
import * as trackerMcp from "@/server/dap/tracker/mcp";
import { MILESTONE_STATUSES } from "@/shared/taxonomy";
import { type McpServer, actor, tool } from "@/server/mcp/context";

export function registerTrackerTools(server: McpServer) {
  // ── DAP timeline tracker (project groups) ──
  const projectGroupId = z.number().int().describe("Project group id from list_project_groups");

  server.registerTool(
    "list_project_groups",
    {
      title: "List DAP project groups",
      description:
        "A DAP cohort's project groups (the teams building projects, tracked by the Telegram timeline tracker; not the co-learning groups of get_dap_group) with their progress: milestones done and total, overdue milestones, open blockers, last mentor meeting and when the next one is due (dates are YYYY-MM-DD, Singapore). Defaults to the current DAP cohort.",
      inputSchema: z.object({ cohortId: z.string().optional().describe("DAP cohort id from list_cohorts; defaults to the current one") }),
    },
    ({ cohortId }) => tool(() => trackerMcp.listProjectGroupProgress(actor(), cohortId))
  );

  server.registerTool(
    "get_project_group_timeline",
    {
      title: "Get a project group's timeline",
      description:
        "One DAP project group's milestones in due-date order, each with its tasks (status, due date, assignee: a member on the list or a name typed in for someone who isn't) and blockers.",
      inputSchema: z.object({ projectGroupId }),
    },
    ({ projectGroupId: id }) => tool(() => trackerMcp.projectGroupTimeline(actor(), id))
  );

  server.registerTool(
    "add_milestones",
    {
      title: "Add milestones to project groups",
      description:
        "Adds the same milestones to several DAP project groups of one cohort: all of its project groups unless projectGroupIds is given. Dates are YYYY-MM-DD; startsOn is optional (without it the milestone is a single point on the timeline). Every row is checked before anything is added.",
      inputSchema: z.object({
        cohortId: z.string().describe("DAP cohort id from list_cohorts"),
        milestones: z.array(z.object({ title: z.string(), startsOn: z.string().nullable().optional(), dueOn: z.string() })),
        projectGroupIds: z.array(z.number().int()).optional().describe("Only these project groups (ids from list_project_groups)"),
      }),
    },
    ({ cohortId, milestones, projectGroupIds }) => tool(() => trackerMcp.addMilestones(actor(), cohortId, milestones, projectGroupIds))
  );

  server.registerTool(
    "set_milestone_status",
    {
      title: "Set a milestone's status",
      description: "Marks a DAP project group's milestone todo, in_progress or done.",
      inputSchema: z.object({ milestoneId: z.number().int().describe("From get_project_group_timeline"), status: z.enum(MILESTONE_STATUSES) }),
    },
    ({ milestoneId, status }) => tool(() => trackerMcp.setMilestoneStatus(actor(), milestoneId, status))
  );

  server.registerTool(
    "log_project_group_meeting",
    {
      title: "Log a project group's mentor meeting",
      description:
        "Records that a DAP project group met its mentors, which restarts its 3-week reminder cycle. date is YYYY-MM-DD (Singapore); leave it out for now. It can't be in the future.",
      inputSchema: z.object({ projectGroupId, date: z.string().optional() }),
    },
    ({ projectGroupId: id, date }) => tool(() => trackerMcp.logProjectGroupMeeting(actor(), id, date))
  );

  server.registerTool(
    "set_meeting_reminders",
    {
      title: "Turn a project group's reminders on or off",
      description: "Whether the bot posts reminders in a DAP project group's Telegram chat: to meet its mentors 3 weeks after the last meeting, and about tasks due within a week or past their deadline.",
      inputSchema: z.object({ projectGroupId, on: z.boolean() }),
    },
    ({ projectGroupId: id, on }) => tool(() => trackerMcp.setMeetingReminders(actor(), id, on))
  );
}
