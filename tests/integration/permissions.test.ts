import "@/tests/helpers/db";
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { getDb } from "@/app/lib/db";
import { cohorts } from "@/app/lib/db/schema";
import { CmsError, type Actor } from "@/app/lib/cms/actor";
import * as cohortsCms from "@/app/lib/cms/cohorts";
import * as links from "@/app/lib/cms/links";
import * as lodges from "@/app/lib/cms/lodges";
import * as newsletter from "@/app/lib/cms/newsletter";
import * as people from "@/app/lib/cms/people";
import * as photos from "@/app/lib/cms/photos";
import * as projects from "@/app/lib/cms/projects";
import * as telegramLink from "@/app/lib/cms/telegram-link";
import * as telegramSettings from "@/app/lib/cms/telegram-settings";
import * as tokens from "@/app/lib/cms/tokens";
import * as tracker from "@/app/lib/cms/tracker";
import * as trackerMcp from "@/app/lib/cms/tracker-mcp";
import { actorFor, ROLE_KEYS, type RoleKey } from "@/tests/helpers/actors";
import { fakeTelegram } from "@/tests/helpers/telegram";

/*
 * Every service write × every role. The expected access is written out here by hand, NOT read
 * from `can`, so a refactor of the permission rules is checked against what the site does today.
 * Columns: exco, superadmin, dap_exco, lodge_exco, lodge_head (head of lodge A only).
 */
const Y = true;
const N = false;
type Access = [exco: boolean, superadmin: boolean, dapExco: boolean, lodgeExco: boolean, lodgeHead: boolean];
type Row = [name: string, access: Access, run: (a: Actor, key: RoleKey) => Promise<unknown>];

const AI = "ai-lodge-s1";
const DAP = "dap-c1";
const admin = actorFor("superadmin");
let lodgeA = 0;
let lodgeB = 0;
let trackId = 0;
let projectGroupId = 0;
let n = 0;
const uniq = (key: string) => `${key.replace("_", "-")}-${++n}`;

/** A fresh project (made by a superadmin), for rows that change one. */
const aiProject = async (status: "draft" | "in_review" = "draft") =>
  (await projects.createProject(admin, { title: `Project ${uniq("p")}`, programme: "AI Lodge", cohortId: AI, lodgeId: lodgeA, trackId, status })).slug;
const dapProject = async () => (await projects.createProject(admin, { title: `Dap ${uniq("p")}`, programme: "DAP", cohortId: DAP })).slug;

const ROWS: Row[] = [
  // Cohorts, tracks, co-learning groups, lodges
  ["createCohort AI Lodge", [Y, Y, N, Y, N], (a, k) => cohortsCms.createCohort(a, { programme: "AI Lodge", slug: uniq(k), name: "S" })],
  ["createCohort DAP", [Y, Y, Y, N, N], (a, k) => cohortsCms.createCohort(a, { programme: "DAP", slug: uniq(k), name: "C" })],
  ["updateCohort AI Lodge", [Y, Y, N, Y, N], (a) => cohortsCms.updateCohort(a, AI, { headline: "h" })],
  ["updateCohort DAP", [Y, Y, Y, N, N], (a) => cohortsCms.updateCohort(a, DAP, { headline: "h" })],
  ["saveTrack", [Y, Y, N, Y, N], (a, k) => cohortsCms.saveTrack(a, { cohortId: AI, name: uniq(k) })],
  ["saveGroup (co-learning)", [Y, Y, Y, N, N], (a, k) => cohortsCms.saveGroup(a, { cohortId: DAP, name: uniq(k) })],
  ["saveLodge", [Y, Y, N, Y, N], (a, k) => lodges.saveLodge(a, { cohortId: AI, name: `Lodge ${uniq(k)}` })],
  // Site
  ["setApplicationsOpen AI Lodge", [Y, Y, N, Y, N], (a) => links.setApplicationsOpen(a, "AI Lodge", true)],
  ["setApplicationsOpen DAP", [Y, Y, N, N, N], (a) => links.setApplicationsOpen(a, "DAP", true)],
  ["saveSiteLinks", [Y, Y, N, N, N], (a) => links.saveSiteLinks(a, { links: {} })],
  ["saveSitePhoto smubia.com", [Y, Y, N, N, N], (a) => photos.saveSitePhoto(a, "home.heroCohort", null)],
  ["saveSitePhoto AI Lodge site", [Y, Y, N, Y, N], (a) => photos.saveSitePhoto(a, "ailodge.moments", null)],
  // Newsletter
  ["saveSessions", [Y, Y, Y, N, N], (a) => newsletter.saveSessions(a, DAP, [{ week: 1, topic: "Intro" }])],
  ["createIssue", [Y, Y, Y, N, N], (a) => newsletter.createIssue(a, DAP)],
  ["updateIssue", [Y, Y, Y, N, N], async (a) => newsletter.updateIssue(a, (await newsletter.createIssue(admin, DAP)).id, { summary: "s" })],
  ["deleteIssue", [Y, Y, Y, N, N], async (a) => newsletter.deleteIssue(a, (await newsletter.createIssue(admin, DAP)).id)],
  // People
  ["savePerson", [N, Y, N, N, N], (a, k) => people.savePerson(a, { email: `${uniq(k)}@smu.edu.sg`, role: "dap_exco" })],
  [
    "removePerson",
    [N, Y, N, N, N],
    async (a, k) => {
      const email = `${uniq(k)}@smu.edu.sg`;
      await people.savePerson(admin, { email, role: "dap_exco" });
      return people.removePerson(a, email);
    },
  ],
  ["setLodgeHeads", [N, Y, N, N, N], (a) => people.setLodgeHeads(a, AI, [])],
  // Projects
  ["createProject AI Lodge in own lodge", [Y, Y, N, Y, Y], (a, k) => projects.createProject(a, { title: `New ${uniq(k)}`, programme: "AI Lodge", cohortId: AI, lodgeId: lodgeA })],
  ["createProject AI Lodge in another lodge", [Y, Y, N, Y, N], (a, k) => projects.createProject(a, { title: `Other ${uniq(k)}`, programme: "AI Lodge", cohortId: AI, lodgeId: lodgeB })],
  ["createProject DAP", [Y, Y, Y, N, N], (a, k) => projects.createProject(a, { title: `Dap new ${uniq(k)}`, programme: "DAP", cohortId: DAP })],
  ["updateProject AI Lodge draft", [Y, Y, N, Y, Y], async (a) => projects.updateProject(a, await aiProject(), { description: "d" })],
  ["updateProject AI Lodge in review", [Y, Y, N, Y, N], async (a) => projects.updateProject(a, await aiProject("in_review"), { description: "d" })],
  ["updateProject DAP", [Y, Y, Y, N, N], async (a) => projects.updateProject(a, await dapProject(), { description: "d" })],
  ["setProjectStatus submit for review", [Y, Y, N, Y, Y], async (a) => projects.setProjectStatus(a, await aiProject(), "in_review")],
  ["setProjectStatus publish", [Y, Y, N, N, N], async (a) => projects.setProjectStatus(a, await aiProject("in_review"), "published")],
  ["setProjectWinner", [Y, Y, N, Y, N], async (a) => projects.setProjectWinner(a, await aiProject(), true)],
  ["deleteProject", [Y, Y, N, N, N], async (a) => projects.deleteProject(a, await aiProject())],
  // Telegram and tokens
  ["setDapChannelId", [Y, Y, N, N, N], (a) => telegramSettings.setDapChannelId(a, "@smubia_dap")],
  ["createAccountLink", [Y, Y, Y, N, N], (a) => telegramLink.createAccountLink(a)],
  ["createChatLink", [Y, Y, Y, N, N], (a) => telegramLink.createChatLink(a, projectGroupId)],
  ["unlinkTelegram for someone else", [Y, Y, N, N, N], (a) => telegramLink.unlinkTelegram(a, "someone@smu.edu.sg")],
  ["revokeToken of someone else", [N, Y, N, N, N], async (a) => tokens.revokeToken(a, (await tokens.createToken({ email: "owner@smu.edu.sg", name: "Owner", role: "dap_exco" }, { name: "t", days: 30 })).row.id)],
  // DAP timeline tracker
  ["saveProjectGroup", [Y, Y, Y, N, N], (a) => tracker.saveProjectGroup(a, { cohortId: DAP, number: 100 + ++n })],
  ["saveMilestone", [Y, Y, Y, N, N], (a) => tracker.saveMilestone(a, { groupId: projectGroupId, title: "M", dueOn: "2030-01-31" })],
  ["setMeetingReminders", [Y, Y, Y, N, N], (a) => tracker.setMeetingReminders(a, projectGroupId, true)],
  ["addMilestones (MCP)", [Y, Y, Y, N, N], (a) => trackerMcp.addMilestones(a, DAP, [{ title: "Kickoff", dueOn: "2030-02-01" }], [projectGroupId])],
];

before(async () => {
  process.env.CMS_BOOTSTRAP_ADMINS = admin.email;
  process.env.TELEGRAM_BOT_TOKEN = "123:test";
  fakeTelegram();
  const db = await getDb();
  await db.insert(cohorts).values([
    { id: AI, programme: "AI Lodge", slug: "s1", name: "S1", visibility: "live" },
    { id: DAP, programme: "DAP", slug: "c1", name: "C1", visibility: "live" },
  ]);
  lodgeA = (await lodges.saveLodge(admin, { cohortId: AI, name: "Alpha" })).id;
  lodgeB = (await lodges.saveLodge(admin, { cohortId: AI, name: "Beta" })).id;
  trackId = (await cohortsCms.saveTrack(admin, { cohortId: AI, name: "Track" })).id;
  projectGroupId = (await tracker.saveProjectGroup(admin, { cohortId: DAP, number: 1, name: "One" })).id;
});

describe("permissions matrix: every service write × every role", () => {
  for (const [name, access, run] of ROWS) {
    it(name, async () => {
      for (const [i, key] of ROLE_KEYS.entries()) {
        const a = actorFor(key, [lodgeA]);
        try {
          await run(a, key);
        } catch (error) {
          if (!(error instanceof CmsError)) throw error;
          assert.ok(!access[i], `${key} should be allowed to ${name}, got: ${error.message}`);
          continue;
        }
        assert.ok(access[i], `${key} should be refused ${name}`);
      }
    });
  }
});
