import { createMcpHandler } from "mcp-handler";
import { devLoginEnabled } from "@/server/auth/auth";
import { can, DEV_MCP_ACTOR, type Actor } from "@/server/core/actor";
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
 * every role.
 */
const TOOL_ACCESS: Record<string, (a: Actor) => boolean> = {
  set_track_winner: (a) => can.setWinner(a),
  create_cohort: (a) => a.role !== "lodge_head",
  update_cohort: (a) => a.role !== "lodge_head",
  save_track: (a) => can.seeLodge(a),
  get_lodge: (a) => can.seeLodge(a),
  save_lodge: (a) => can.seeLodge(a),
  copy_lodge: (a) => can.seeLodge(a),
  set_lodge_applications: (a) => can.seeLodge(a),
  get_ailodge_feed: (a) => can.seeLodge(a),
  set_applications_open: (a) => can.setApplications(a, "AI Lodge") || can.setApplications(a, "DAP"),
  list_site_links: (a) => can.editLinks(a),
  update_site_links: (a) => can.editLinks(a),
  list_photos: (a) => can.seePhotos(a),
  set_photo: (a) => can.seePhotos(a),
  get_dap_group: (a) => can.seeDap(a),
  save_dap_group: (a) => can.seeDap(a),
  list_issues: (a) => can.editNewsletter(a),
  get_issue: (a) => can.editNewsletter(a),
  create_issue: (a) => can.editNewsletter(a),
  update_issue: (a) => can.editNewsletter(a),
  publish_issue: (a) => can.editNewsletter(a),
  schedule_issue: (a) => can.editNewsletter(a),
  send_issue_test: (a) => can.editNewsletter(a),
  update_sessions: (a) => can.editNewsletter(a),
  list_people: (a) => can.managePeople(a),
  set_person: (a) => can.managePeople(a),
  remove_person: (a) => can.managePeople(a),
  set_lodge_heads: (a) => can.managePeople(a),
  list_project_groups: (a) => can.tracker(a),
  get_project_group_timeline: (a) => can.tracker(a),
  add_milestones: (a) => can.tracker(a),
  set_milestone_status: (a) => can.tracker(a),
  log_project_group_meeting: (a) => can.tracker(a),
  set_meeting_reminders: (a) => can.tracker(a),
};

const handler = createMcpHandler(
  (server) => {
    // The server is built per request (stateless), inside guarded(), so actor() is known here.
    const register = server.registerTool.bind(server);
    server.registerTool = ((name: string, ...rest: unknown[]) =>
      TOOL_ACCESS[name] && !TOOL_ACCESS[name](actor())
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
