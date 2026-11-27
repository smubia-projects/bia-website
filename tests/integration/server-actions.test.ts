import "@tests/helpers/db";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { before, describe, it, mock } from "node:test";
import type { Actor } from "@/server/core/actor";
import { CmsError } from "@/server/core/actor";
import { actorFor } from "@tests/helpers/actors";
import { fakeTelegram } from "@tests/helpers/telegram";

/*
 * The admin server actions, one per feature, through run(): the signed-in actor comes from a
 * mocked session (Auth.js needs a Next request), and revalidatePath is a no-op outside Next.
 * The rules themselves are pinned in permissions.test.ts; this checks the action layer:
 * it re-reads the session, passes the actor through, and turns errors into ActionResults.
 */

let signedIn: Actor | null = null;
const session = pathToFileURL(path.resolve("src/server/auth/session.ts")).href;
mock.module(session, {
  namedExports: {
    requireActor: async () => {
      if (!signedIn) throw new CmsError("Session expired. Sign in again.");
      return signedIn;
    },
    getCurrentActor: async () => signedIn,
    requireActorPage: async () => signedIn,
  },
});
const revalidated: string[] = [];
mock.module("next/cache", {
  namedExports: {
    revalidatePath: (p: string) => revalidated.push(p),
    revalidateTag: () => undefined,
    unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  },
});

process.env.TELEGRAM_BOT_TOKEN = "123:test";
process.env.CMS_BOOTSTRAP_ADMINS = "super@smu.edu.sg";
fakeTelegram();

type Actions = {
  projects: typeof import("@/app/admin/actions/projects");
  site: typeof import("@/app/admin/actions/site");
  cohorts: typeof import("@/app/admin/actions/cohorts");
  ailodge: typeof import("@/app/admin/actions/ailodge");
  dap: typeof import("@/app/admin/actions/dap");
  tokens: typeof import("@/app/admin/actions/tokens");
  people: typeof import("@/app/admin/actions/people");
  tracker: typeof import("@/app/admin/actions/tracker");
  telegram: typeof import("@/app/admin/actions/telegram");
};
const a = {} as Actions;

before(async () => {
  // Imported after the mocks, so the actions see the mocked session and cache.
  a.projects = await import("@/app/admin/actions/projects");
  a.site = await import("@/app/admin/actions/site");
  a.cohorts = await import("@/app/admin/actions/cohorts");
  a.ailodge = await import("@/app/admin/actions/ailodge");
  a.dap = await import("@/app/admin/actions/dap");
  a.tokens = await import("@/app/admin/actions/tokens");
  a.people = await import("@/app/admin/actions/people");
  a.tracker = await import("@/app/admin/actions/tracker");
  a.telegram = await import("@/app/admin/actions/telegram");
  signedIn = actorFor("superadmin");
  assert.ok((await a.cohorts.createCohortAction("AI Lodge", "s1", "S1")).ok);
  assert.ok((await a.cohorts.createCohortAction("DAP", "c1", "C1")).ok);
});

const as = (key: Parameters<typeof actorFor>[0]) => {
  signedIn = actorFor(key);
};

describe("server actions through run()", () => {
  it("refuse a signed-out request", async () => {
    signedIn = null;
    assert.deepEqual(await a.tokens.createTokenAction("t", 30), { ok: false, error: "Session expired. Sign in again." });
  });

  it("projects: save a draft, and refuse what the role can't do", async () => {
    as("lodge_exco");
    const saved = await a.projects.saveProjectAction(null, { title: "Action Draft", programme: "AI Lodge", cohortId: "ai-lodge-s1" }, "draft");
    assert.ok(saved.ok && saved.data.status === "draft", JSON.stringify(saved));
    const refused = await a.projects.deleteProjectAction(saved.ok ? saved.data.slug : "");
    assert.deepEqual(refused, { ok: false, error: "Deleting projects requires the exco admin role" });
  });

  it("site: open applications, and refresh the CMS", async () => {
    as("exco");
    revalidated.splice(0);
    assert.ok((await a.site.setApplicationsOpenAction("DAP", true)).ok);
    assert.ok(revalidated.includes("/admin"));
    as("dap_exco");
    assert.equal((await a.site.setApplicationsOpenAction("DAP", false)).ok, false);
  });

  it("cohorts, AI Lodge and DAP: create a run, a track and an issue", async () => {
    as("lodge_exco");
    assert.ok((await a.ailodge.saveTrackAction({ cohortId: "ai-lodge-s1", name: "Track A" })).ok);
    assert.equal((await a.cohorts.createCohortAction("DAP", "c2", "C2")).ok, false);
    as("dap_exco");
    assert.ok((await a.dap.createIssueAction("dap-c1")).ok);
  });

  it("tokens and people: a token for yourself; people for superadmins only", async () => {
    as("dap_exco");
    const token = await a.tokens.createTokenAction("Laptop", 30);
    assert.ok(token.ok && token.data.startsWith("smubia_pat_"));
    as("exco");
    assert.equal((await a.people.savePersonAction({ email: "new@smu.edu.sg", role: "dap_exco" })).ok, false);
    as("superadmin");
    assert.ok((await a.people.savePersonAction({ email: "new@smu.edu.sg", role: "dap_exco" })).ok);
  });

  it("tracker and Telegram: DAP exco only", async () => {
    as("dap_exco");
    const group = await a.tracker.saveProjectGroupAction({ cohortId: "dap-c1", number: 1, name: "Alpha" });
    assert.ok(group.ok, JSON.stringify(group));
    as("lodge_exco");
    assert.deepEqual(await a.tracker.saveProjectGroupAction({ cohortId: "dap-c1", number: 2 }), { ok: false, error: "This role cannot use the timeline tracker" });
    as("exco");
    assert.ok((await a.telegram.setDapChannelAction("@smubia_dap")).ok);
    as("dap_exco");
    assert.equal((await a.telegram.setDapChannelAction("@smubia_dap")).ok, false);
  });
});
