import "../helpers/db";
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { getDb } from "@/app/lib/db";
import { accessTokens, cohorts } from "@/app/lib/db/schema";
import { revokeToken } from "@/app/lib/cms/tokens";
import { POST } from "@/app/api/mcp/route";
import { personWithToken } from "../helpers/tokens";

/*
 * The MCP endpoint, called as Claude would: JSON-RPC over HTTP with a personal access token.
 * The tool list per role is written out by hand (not read from TOOL_ACCESS), so the
 * permissions refactor is checked against what each role sees today.
 */

let id = 0;
async function rpc(token: string | null, method: string, params: Record<string, unknown> = {}) {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json, text/event-stream" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await POST(new Request("http://localhost/api/mcp", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) }));
  const text = await res.text();
  if (res.status !== 200) return { status: res.status, body: text };
  // The handler may answer as JSON or as a single server-sent event.
  const json = text.startsWith("{") ? text : (text.split("\n").find((l) => l.startsWith("data: ")) ?? "").slice(6);
  return { status: res.status, body: JSON.parse(json) };
}

const toolNames = async (token: string) => ((await rpc(token, "tools/list")).body.result.tools as { name: string }[]).map((t) => t.name).sort();
const callTool = async (token: string, name: string, args: Record<string, unknown> = {}) => (await rpc(token, "tools/call", { name, arguments: args })).body.result;

const EVERYONE = ["whoami", "create_project", "get_project", "list_cohorts", "list_projects", "set_project_status", "update_project", "upload_image"];
const LODGE = ["copy_lodge", "get_ailodge_feed", "get_lodge", "save_lodge", "save_track", "set_lodge_applications", "set_track_winner"];
const COHORT = ["create_cohort", "update_cohort"];
const DAP = ["get_dap_group", "save_dap_group", "create_issue", "get_issue", "list_issues", "publish_issue", "schedule_issue", "send_issue_test", "update_issue", "update_sessions"];
const TRACKER = ["add_milestones", "get_project_group_timeline", "list_project_groups", "log_project_group_meeting", "set_meeting_reminders", "set_milestone_status"];
const EXCO = ["list_site_links", "update_site_links", "set_applications_open", "list_photos", "set_photo"];
const PEOPLE = ["list_people", "remove_person", "set_lodge_heads", "set_person"];

const EXPECTED: Record<string, string[]> = {
  superadmin: [...EVERYONE, ...LODGE, ...COHORT, ...DAP, ...TRACKER, ...EXCO, ...PEOPLE],
  exco: [...EVERYONE, ...LODGE, ...COHORT, ...DAP, ...TRACKER, ...EXCO],
  dap_exco: [...EVERYONE, ...COHORT, ...DAP, ...TRACKER],
  lodge_exco: [...EVERYONE, ...LODGE, ...COHORT, "set_applications_open", "list_photos", "set_photo"],
  lodge_head: EVERYONE,
};

const tokens: Record<string, string> = {};

before(async () => {
  process.env.CMS_BOOTSTRAP_ADMINS = "super@smu.edu.sg";
  const db = await getDb();
  await db.insert(cohorts).values({ id: "dap-c1", programme: "DAP", slug: "c1", name: "C1", visibility: "live" });
  tokens.superadmin = (await personWithToken({ email: "super@smu.edu.sg", role: "exco" })).token;
  tokens.exco = (await personWithToken({ email: "exco@smu.edu.sg", role: "exco" })).token;
  tokens.dap_exco = (await personWithToken({ email: "dap@smu.edu.sg", role: "dap_exco" })).token;
  tokens.lodge_exco = (await personWithToken({ email: "lodge@smu.edu.sg", role: "lodge_exco" })).token;
  tokens.lodge_head = (await personWithToken({ email: "head@smu.edu.sg", role: "lodge_head", lodgeIds: [] })).token;
});

describe("MCP endpoint", () => {
  it("lists only the tools each role can use", async () => {
    for (const [role, expected] of Object.entries(EXPECTED)) {
      assert.deepEqual(await toolNames(tokens[role]), [...expected].sort(), role);
    }
    assert.equal(EXPECTED.lodge_head.length, 8); // AGENTS.md: a lodge head sees 8 tools
  });

  it("acts as the token's owner, with their current role", async () => {
    const me = JSON.parse((await callTool(tokens.dap_exco, "whoami")).content[0].text);
    assert.equal(me.email, "dap@smu.edu.sg");
    assert.match(JSON.stringify(me), /dap_exco|DAP exco/);
  });

  it("checks every call in the service layer too", async () => {
    // A lodge head never sees create_cohort; calling it anyway is refused.
    const res = await rpc(tokens.lodge_head, "tools/call", { name: "create_cohort", arguments: { programme: "DAP", slug: "x", name: "X" } });
    assert.ok(res.body.error || res.body.result?.isError, JSON.stringify(res.body));
  });

  it("refuses unknown, revoked and expired tokens", async () => {
    assert.equal((await rpc("smubia_pat_not-a-real-token", "tools/list")).status, 401);
    assert.equal((await rpc("some-other-token", "tools/list")).status, 401);

    const revoked = await personWithToken({ email: "revoked@smu.edu.sg", role: "exco" });
    assert.equal((await rpc(revoked.token, "tools/list")).status, 200);
    await revokeToken(revoked.actor, revoked.tokenId);
    assert.equal((await rpc(revoked.token, "tools/list")).status, 401);

    const expired = await personWithToken({ email: "expired@smu.edu.sg", role: "exco" });
    const db = await getDb();
    await db.update(accessTokens).set({ expiresAt: new Date(Date.now() - 1000).toISOString() }).where(eq(accessTokens.id, expired.tokenId));
    assert.equal((await rpc(expired.token, "tools/list")).status, 401);
  });

  it("without a token, works only in local development (as a superadmin)", async () => {
    const names = (((await rpc(null, "tools/list")).body.result.tools as { name: string }[]) ?? []).map((t) => t.name);
    assert.ok(names.includes("set_person"));
  });
});
