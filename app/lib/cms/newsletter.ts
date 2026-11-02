import { and, asc, desc, eq, lte, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import { cohorts, dapGroups, issues, sessions, type DapGroupRow, type IssueBlock, type IssueRow, type SessionRow } from "@/app/lib/db/schema";
import { SCHEDULER_ACTOR, can, CmsError, ensure, type Actor } from "./actor";
import { getCohort, type Cohort } from "./cohorts";
import { issuePath } from "./paths";
import { revalidateCms, TAGS } from "./revalidate";
import { sendIssueToTelegram, SITE_URL } from "./telegram";
import { BLOCK_DEFAULT_HEADING, BLOCK_TYPES, type BlockType } from "./taxonomy";

/** A schedule row with the DAP group teaching it (members and mentors included). */
export type Session = SessionRow & { group: DapGroupRow | null };
/** `path` is the issue's public address (it only resolves once published). */
export type Issue = IssueRow & { cohortSlug: string; path: string };

/** Scheduled issues go out at 09:00 SGT (01:00 UTC) on their date. */
export const PUBLISH_HOUR_UTC = 1;

/** "week-3" → 3, the issue segment of /dap/<cohort>/week-<n>. */
export function parseIssueWeek(segment: string) {
  const m = segment.match(/^week-(\d{1,2})$/);
  return m ? Number(m[1]) : null;
}

/** "12 Oct 2026" in Singapore time. */
export function formatIssueDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(new Date(iso));
}

function withPath(row: IssueRow, cohortSlug: string): Issue {
  return { ...row, cohortSlug, path: issuePath(cohortSlug, row.week) };
}

async function requireDapCohort(cohortId: string): Promise<Cohort> {
  const cohort = await getCohort(cohortId);
  ensure(cohort && cohort.programme === "DAP", "DAP cohort not found");
  return cohort;
}

// ── Sessions ─────────────────────────────────────────────────────────────

export async function listSessions(cohortId: string): Promise<Session[]> {
  const db = await getDb();
  const rows = await db
    .select({ s: sessions, g: dapGroups })
    .from(sessions)
    .leftJoin(dapGroups, eq(sessions.groupId, dapGroups.id))
    .where(eq(sessions.cohortId, cohortId))
    .orderBy(asc(sessions.week));
  return rows.map((r) => ({ ...r.s, group: r.g }));
}

export interface SessionInput {
  week: number;
  topic?: string;
  /** A DAP group of this cohort, or null for none */
  groupId?: number | null;
  slides?: string;
}

/** The editable session columns, read from the row an upsert tried to insert. */
const SESSION_EXCLUDED = {
  topic: sql`excluded.topic`,
  groupId: sql`excluded.group_id`,
  slides: sql`excluded.slides`,
};
type SessionField = keyof typeof SESSION_EXCLUDED;

export async function saveSessions(actor: Actor, cohortId: string, rows: SessionInput[]) {
  ensure(can.editNewsletter(actor), "You can't edit the co-learning schedule");
  await requireDapCohort(cohortId);
  const db = await getDb();
  const groupIds = new Set((await db.select({ id: dapGroups.id }).from(dapGroups).where(eq(dapGroups.cohortId, cohortId))).map((g) => g.id));

  // Everything is validated before the first write. A repeated week merges, last value winning.
  const weeks = new Map<number, Partial<Pick<SessionRow, SessionField>>>();
  for (const r of rows) {
    ensure(Number.isInteger(r.week) && r.week >= 1 && r.week <= 30, "Week must be between 1 and 30");
    ensure(!r.groupId || groupIds.has(r.groupId), "That group isn't in this cohort");
    if (r.slides) ensure(/^https?:\/\//i.test(r.slides.trim()), "Slides links must start with https://");
    weeks.set(r.week, {
      ...weeks.get(r.week),
      ...(r.topic !== undefined ? { topic: r.topic.trim() } : {}),
      ...(r.groupId !== undefined ? { groupId: r.groupId || null } : {}),
      ...(r.slides !== undefined ? { slides: r.slides.trim() } : {}),
    });
  }

  // Weeks setting the same fields share one statement, so an editor save is a single
  // upsert. They can't all share one: a field a week leaves out must keep its stored value.
  const batches = new Map<string, { fields: SessionField[]; values: (typeof sessions.$inferInsert)[] }>();
  for (const [week, values] of weeks) {
    const fields = (Object.keys(SESSION_EXCLUDED) as SessionField[]).filter((f) => values[f] !== undefined);
    const batch = batches.get(fields.join()) ?? { fields, values: [] };
    batch.values.push({ cohortId, week, ...values });
    batches.set(fields.join(), batch);
  }
  await Promise.all(
    [...batches.values()].map(({ fields, values }) => {
      const insert = db.insert(sessions).values(values);
      if (fields.length === 0) return insert.onConflictDoNothing();
      return insert.onConflictDoUpdate({
        target: [sessions.cohortId, sessions.week],
        set: Object.fromEntries(fields.map((f) => [f, SESSION_EXCLUDED[f]])),
      });
    })
  );
  revalidateCms("newsletter");
  return listSessions(cohortId);
}

// ── Issues (CMS) ─────────────────────────────────────────────────────────

export async function listIssues(cohortId: string): Promise<Issue[]> {
  const cohort = await requireDapCohort(cohortId);
  const db = await getDb();
  const rows = await db.select().from(issues).where(eq(issues.cohortId, cohortId)).orderBy(desc(issues.week));
  return rows.map((r) => withPath(r, cohort.slug));
}

export async function getIssue(id: number): Promise<Issue | null> {
  const db = await getDb();
  const [row] = await db
    .select({ i: issues, cohortSlug: cohorts.slug })
    .from(issues)
    .innerJoin(cohorts, eq(issues.cohortId, cohorts.id))
    .where(eq(issues.id, id));
  return row ? withPath(row.i, row.cohortSlug) : null;
}

function defaultBlocks(): IssueBlock[] {
  return (["Text", "Team updates", "Shout-outs"] as BlockType[]).map((type, i) => ({
    id: `b${i + 1}`,
    type,
    heading: BLOCK_DEFAULT_HEADING[type],
    body: "",
  }));
}

function cleanBlocks(blocks: IssueBlock[]): IssueBlock[] {
  return blocks.map((b, i) => {
    ensure((BLOCK_TYPES as readonly string[]).includes(b.type), `Unknown section type "${b.type}"`);
    return {
      id: b.id || `b${Date.now()}${i}`,
      type: b.type,
      heading: (b.heading ?? "").trim(),
      body: b.body ?? "",
      ...(b.type === "Image" ? { image: (b.image ?? "").trim() } : {}),
    };
  });
}

export async function createIssue(actor: Actor, cohortId: string, week?: number): Promise<Issue> {
  ensure(can.editNewsletter(actor), "You can't write newsletter issues");
  const cohort = await requireDapCohort(cohortId);
  const existing = await listIssues(cohortId);
  const nextWeek = week ?? Math.max(0, ...existing.map((i) => i.week)) + 1;
  ensure(!existing.some((i) => i.week === nextWeek), `Week ${nextWeek} already has an issue`);
  const session = (await listSessions(cohortId)).find((s) => s.week === nextWeek);
  const db = await getDb();
  const [row] = await db
    .insert(issues)
    .values({
      cohortId,
      week: nextWeek,
      title: session?.topic ? `Week ${nextWeek}: ${session.topic}` : `Week ${nextWeek}`,
      blocks: defaultBlocks(),
      updatedBy: actor.email,
    })
    .returning();
  return withPath(row, cohort.slug);
}

export interface IssueInput {
  week?: number;
  title?: string;
  summary?: string;
  coverImage?: string;
  blocks?: IssueBlock[];
  postToTelegram?: boolean;
}

export async function updateIssue(actor: Actor, id: number, input: IssueInput): Promise<Issue> {
  ensure(can.editNewsletter(actor), "You can't edit newsletter issues");
  const current = await getIssue(id);
  ensure(current, "Issue not found");
  const values: Partial<typeof issues.$inferInsert> = {
    updatedAt: new Date().toISOString(),
    updatedBy: actor.email,
  };
  if (input.week !== undefined && input.week !== current.week) {
    ensure(Number.isInteger(input.week) && input.week >= 1, "Pick a week");
    const taken = (await listIssues(current.cohortId)).some((i) => i.week === input.week);
    ensure(!taken, `Week ${input.week} already has an issue`);
    values.week = input.week;
  }
  if (input.title !== undefined) {
    values.title = input.title.trim();
    ensure(values.title, "Title is required");
  }
  if (input.summary !== undefined) values.summary = input.summary.trim();
  if (input.coverImage !== undefined) values.coverImage = input.coverImage.trim();
  if (input.blocks !== undefined) values.blocks = cleanBlocks(input.blocks);
  if (input.postToTelegram !== undefined) values.postToTelegram = input.postToTelegram;
  const db = await getDb();
  await db.update(issues).set(values).where(eq(issues.id, id));
  if (current.status === "published") revalidateCms("newsletter");
  return (await getIssue(id))!;
}

async function telegramPayload(issue: Issue) {
  const session = (await listSessions(issue.cohortId)).find((s) => s.week === issue.week);
  return {
    week: issue.week,
    title: issue.title,
    summary: issue.summary,
    coverImage: issue.coverImage,
    url: `${SITE_URL}${issue.path}`,
    sessionTopic: session?.topic || undefined,
    sessionGroup: session?.group?.name || undefined,
  };
}

export type TelegramOutcome = "sent" | "dry-run" | "skipped" | "not-configured" | { error: string };

/** Publishes now and, when enabled, posts once to the DAP Telegram channel. */
export async function publishIssue(actor: Actor, id: number): Promise<{ issue: Issue; telegram: TelegramOutcome }> {
  ensure(can.editNewsletter(actor), "You can't publish newsletter issues");
  const current = await getIssue(id);
  ensure(current, "Issue not found");
  ensure(current.title.trim(), "Add a title before publishing");
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .update(issues)
    .set({
      status: "published",
      publishAt: null,
      publishedAt: current.publishedAt ?? now,
      updatedAt: now,
      updatedBy: actor.email,
    })
    .where(eq(issues.id, id));
  revalidateCms("newsletter");

  let telegram: TelegramOutcome = "skipped";
  if (current.postToTelegram && !current.telegramPostedAt) {
    const channel = process.env.TELEGRAM_DAP_CHANNEL_ID;
    if (!channel && process.env.TELEGRAM_BOT_TOKEN) {
      telegram = "not-configured";
    } else {
      try {
        const res = await sendIssueToTelegram(channel || "(DAP channel)", await telegramPayload(current));
        telegram = res.dryRun ? "dry-run" : "sent";
        if (!res.dryRun) {
          await db.update(issues).set({ telegramPostedAt: new Date().toISOString() }).where(eq(issues.id, id));
        }
      } catch (error) {
        telegram = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  return { issue: (await getIssue(id))!, telegram };
}

/** `date` is YYYY-MM-DD; the issue goes out at about 09:00 SGT that day. */
export async function scheduleIssue(actor: Actor, id: number, date: string): Promise<Issue> {
  ensure(can.editNewsletter(actor), "You can't schedule newsletter issues");
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(date), "Pick a date to schedule");
  const current = await getIssue(id);
  ensure(current, "Issue not found");
  ensure(current.status !== "published", "This issue is already published");
  const publishAt = new Date(`${date}T${String(PUBLISH_HOUR_UTC).padStart(2, "0")}:00:00Z`);
  ensure(publishAt.getTime() > Date.now() - 60 * 60 * 1000, "Pick today or a later date");
  const db = await getDb();
  await db
    .update(issues)
    .set({ status: "scheduled", publishAt: publishAt.toISOString(), updatedAt: new Date().toISOString(), updatedBy: actor.email })
    .where(eq(issues.id, id));
  return (await getIssue(id))!;
}

/** Back to draft: unpublishes or cancels a schedule. */
export async function revertIssueToDraft(actor: Actor, id: number): Promise<Issue> {
  ensure(can.editNewsletter(actor), "You can't edit newsletter issues");
  const db = await getDb();
  const current = await getIssue(id);
  ensure(current, "Issue not found");
  await db
    .update(issues)
    .set({ status: "draft", publishAt: null, updatedAt: new Date().toISOString(), updatedBy: actor.email })
    .where(eq(issues.id, id));
  if (current.status === "published") revalidateCms("newsletter");
  return (await getIssue(id))!;
}

export async function deleteIssue(actor: Actor, id: number) {
  ensure(can.editNewsletter(actor), "You can't delete newsletter issues");
  const db = await getDb();
  const deleted = await db.delete(issues).where(eq(issues.id, id)).returning({ status: issues.status });
  if (deleted.length === 0) throw new CmsError("Issue not found");
  if (deleted[0].status === "published") revalidateCms("newsletter");
}

/** Sends the issue as it would appear in the channel, to one person. */
export async function sendIssueTest(actor: Actor, id: number, telegramUserId: string) {
  ensure(can.editNewsletter(actor), "You can't send newsletter tests");
  ensure(/^-?\d{4,}$/.test(telegramUserId.trim()), "A Telegram user ID is a number, like 123456789");
  const issue = await getIssue(id);
  ensure(issue, "Issue not found");
  return sendIssueToTelegram(telegramUserId, await telegramPayload(issue));
}

/** Daily cron: publishes every scheduled issue whose time has come. */
export async function publishDueIssues() {
  const db = await getDb();
  const due = await db
    .select({ id: issues.id })
    .from(issues)
    .where(and(eq(issues.status, "scheduled"), lte(issues.publishAt, new Date().toISOString())));
  const results = [];
  for (const { id } of due) {
    results.push({ id, ...(await publishIssue(SCHEDULER_ACTOR, id)) });
  }
  return results.map((r) => ({ id: r.id, week: r.issue.week, telegram: r.telegram }));
}

// ── Public (cached) ──────────────────────────────────────────────────────

/** One DAP cohort's run: its schedule and published issues. */
export interface PublicRun {
  cohort: Cohort;
  sessions: Session[];
  /** Published issues, newest week first */
  issues: Issue[];
}

const readRun = unstable_cache(
  async (cohortSlug: string): Promise<PublicRun | null> => {
    const db = await getDb();
    const [cohort] = await db
      .select()
      .from(cohorts)
      .where(and(eq(cohorts.programme, "DAP"), eq(cohorts.slug, cohortSlug)));
    if (!cohort || cohort.visibility === "hidden") return null;
    const rows = await db
      .select()
      .from(issues)
      .where(and(eq(issues.cohortId, cohort.id), eq(issues.status, "published")))
      .orderBy(desc(issues.week));
    return {
      cohort,
      sessions: await listSessions(cohort.id),
      issues: rows.map((r) => withPath(r, cohort.slug)),
    };
  },
  ["cms-public-dap-run"],
  { revalidate: 3600, tags: [TAGS.newsletter, TAGS.cohorts] }
);

export async function getPublicRun(cohortSlug: string): Promise<PublicRun | null> {
  try {
    return await readRun(cohortSlug);
  } catch (error) {
    console.error(`[cms] DAP run read failed for "${cohortSlug}"`, error);
    return null;
  }
}
