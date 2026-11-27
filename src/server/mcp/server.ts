import { createMcpHandler } from "mcp-handler";
import { devLoginEnabled } from "@/server/auth/auth";
import { DEV_MCP_ACTOR, type Actor } from "@/server/core/actor";
import { hasAny, type Capability } from "@/server/core/permissions";
import { actorForToken } from "@/server/people/tokens";
import { actor, requestActor } from "./context";
import { registerCohortsTools } from "./tools/cohorts";
import { registerProjectsTools } from "./tools/projects";
import { registerSiteTools } from "./tools/site";
import { registerPeopleTools } from "./tools/people";
import { registerDapTools } from "./tools/dap";
import { registerTrackerTools } from "./tools/tracker";

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

/*
 * Progressive disclosure: each token only lists the tools its owner's role can
 * use, so a lodge head's Claude never sees (or spends tokens on) exco tools.
 * The service layer still checks every call. Tools not listed here are open to
 * every role. Each entry names the capabilities (any of them) from ROLE_CAPS in
 * src/server/core/permissions.ts, the table the service layer checks too.
 */
const TOOL_ACCESS: Record<string, Capability | Capability[]> = {
  set_track_winner: "setWinner",
  create_cohort: ["editAILodge", "editDap"],
  update_cohort: ["editAILodge", "editDap"],
  save_track: "seeLodge",
  get_lodge: "seeLodge",
  save_lodge: "seeLodge",
  copy_lodge: "seeLodge",
  set_lodge_applications: "seeLodge",
  get_ailodge_feed: "seeLodge",
  set_applications_open: ["setAILodgeApplications", "setDapApplications"],
  list_site_links: "editLinks",
  update_site_links: "editLinks",
  list_photos: "seePhotos",
  set_photo: "seePhotos",
  get_dap_group: "seeDap",
  save_dap_group: "seeDap",
  list_issues: "editNewsletter",
  get_issue: "editNewsletter",
  create_issue: "editNewsletter",
  update_issue: "editNewsletter",
  publish_issue: "editNewsletter",
  schedule_issue: "editNewsletter",
  send_issue_test: "editNewsletter",
  update_sessions: "editNewsletter",
  list_people: "managePeople",
  set_person: "managePeople",
  remove_person: "managePeople",
  set_lodge_heads: "managePeople",
  list_project_groups: "tracker",
  get_project_group_timeline: "tracker",
  add_milestones: "tracker",
  set_milestone_status: "tracker",
  log_project_group_meeting: "tracker",
  set_meeting_reminders: "tracker",
};

const handler = createMcpHandler(
  (server) => {
    // The server is built per request (stateless), inside guarded(), so actor() is known here.
    const register = server.registerTool.bind(server);
    server.registerTool = ((name: string, ...rest: unknown[]) =>
      TOOL_ACCESS[name] && !hasAny(actor(), [TOOL_ACCESS[name]].flat())
        ? undefined
        : (register as (...args: unknown[]) => unknown)(name, ...rest)) as typeof server.registerTool;

    registerCohortsTools(server);
    registerProjectsTools(server);
    registerSiteTools(server);
    registerPeopleTools(server);
    registerDapTools(server);
    registerTrackerTools(server);
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

export async function guarded(request: Request) {
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
