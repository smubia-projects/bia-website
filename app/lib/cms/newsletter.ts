import { and, asc, desc, eq, lte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getDb } from "@/app/lib/db";
import { cohorts, issues, sessions, type IssueBlock, type IssueRow, type SessionRow } from "@/app/lib/db/schema";
import { AGENT_ACTOR, can, CmsError, ensure, type Actor } from "./actor";
import { getCohort, listCohorts, pickCurrentCohort, type Cohort } from "./cohorts";
import { revalidateCms, TAGS } from "./revalidate";
import { sendIssueToTelegram, SITE_URL } from "./telegram";
import { BLOCK_DEFAULT_HEADING, BLOCK_TYPES, TEACHING_GROUPS, type BlockType } from "./taxonomy";

export type Session = SessionRow;
export type Issue = IssueRow & { slug: string; cohortSlug: string };

/** Scheduled issues go out at 09:00 SGT (01:00 UTC) on their date. */
export const PUBLISH_HOUR_UTC = 1;

export const issueSlug = (cohortSlug: string, week: number) => `${cohortSlug}-week-${week}`;
export const issuePath = (cohortSlug: string, week: number) => `/dap/newsletter/${issueSlug(cohortSlug, week)}`;

export function parseIssueSlug(slug: string) {
  const m = slug.match(/^([a-z0-9-]+)-week-(\d+)$/);
  return m ? { cohortSlug: m[1], week: Number(m[2]) } : null;
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

function withSlug(row: IssueRow, cohortSlug: string): Issue {
  return { ...row, slug: issueSlug(cohortSlug, row.week), cohortSlug };
}

async function requireDapCohort(cohortId: string): Promise<Cohort> {
  const cohort = await getCohort(cohortId);
  ensure(cohort && cohort.programme === "DAP", "DAP cohort not found");
  return cohort;
}

// ── Sessions ─────────────────────────────────────────────────────────────

export async function listSessions(cohortId: string): Promise<Session[]> {
  const db = await getDb();
  return db.select().from(sessions).where(eq(sessions.cohortId, cohortId)).orderBy(asc(sessions.week));
}

export interface SessionInput {
  week: number;
  topic?: string;
  group?: string;
  slides?: string;
}

export async function saveSessions(actor: Actor, cohortId: string, rows: SessionInput[]) {
  ensure(can.editNewsletter(actor), "You can't edit the co-learning schedule");
  await requireDapCohort(cohortId);
  const db = await getDb();
  for (const r of rows) {
    ensure(Number.isInteger(r.week) && r.week >= 1 && r.week <= 30, "Week must be between 1 and 30");
    if (r.group) {
      ensure((TEACHING_GROUPS as readonly string[]).includes(r.group), `Teaching group must be one of: ${TEACHING_GROUPS.join(", ")}`);
    }
    if (r.slides) ensure(/^https?:\/\//i.test(r.slides.trim()), "Slides links must start with https://");
    const values = {
      ...(r.topic !== undefined ? { topic: r.topic.trim() } : {}),
      ...(r.group !== undefined ? { group: r.group } : {}),
      ...(r.slides !== undefined ? { slides: r.slides.trim() } : {}),
    };
    await db
      .insert(sessions)
      .values({ cohortId, week: r.week, ...values })
      .onConflictDoUpdate({ target: [sessions.cohortId, sessions.week], set: values });
  }
  revalidateCms("newsletter");
  return listSessions(cohortId);
}

// ── Issues (CMS) ─────────────────────────────────────────────────────────

export async function listIssues(cohortId: string): Promise<Issue[]> {
  const cohort = await requireDapCohort(cohortId);
  const db = await getDb();
  const rows = await db.select().from(issues).where(eq(issues.cohortId, cohortId)).orderBy(desc(issues.week));
  return rows.map((r) => withSlug(r, cohort.slug));
}

export async function getIssue(id: number): Promise<Issue | null> {
  const db = await getDb();
  const [row] = await db
    .select({ i: issues, cohortSlug: cohorts.slug })
    .from(issues)
    .innerJoin(cohorts, eq(issues.cohortId, cohorts.id))
    .where(eq(issues.id, id));
  return row ? withSlug(row.i, row.cohortSlug) : null;
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
  return withSlug(row, cohort.slug);
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
    url: `${SITE_URL}${issuePath(issue.cohortSlug, issue.week)}`,
    sessionTopic: session?.topic || undefined,
    sessionGroup: session?.group || undefined,
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
    results.push({ id, ...(await publishIssue(AGENT_ACTOR, id)) });
  }
  return results.map((r) => ({ id: r.id, week: r.issue.week, telegram: r.telegram }));
}

// ── Public (cached) ──────────────────────────────────────────────────────

export interface PublicNewsletter {
  cohort: Cohort | null;
  sessions: Session[];
  /** Published issues, newest week first */
  issues: Issue[];
}

const readNewsletter = unstable_cache(
  async (): Promise<PublicNewsletter> => {
    const all = (await listCohorts("DAP")).filter((c) => c.visibility !== "hidden");
    const cohort = pickCurrentCohort(all);
    if (!cohort) return { cohort: null, sessions: [], issues: [] };
    const db = await getDb();
    const rows = await db
      .select()
      .from(issues)
      .where(and(eq(issues.cohortId, cohort.id), eq(issues.status, "published")))
      .orderBy(desc(issues.week));
    return {
      cohort,
      sessions: await listSessions(cohort.id),
      issues: rows.map((r) => withSlug(r, cohort.slug)),
    };
  },
  ["cms-public-newsletter"],
  { revalidate: 3600, tags: [TAGS.newsletter, TAGS.cohorts] }
);

export async function getPublicNewsletter(): Promise<PublicNewsletter> {
  try {
    return await readNewsletter();
  } catch (error) {
    console.error("[cms] newsletter read failed", error);
    return { cohort: null, sessions: [], issues: [] };
  }
}

const readIssueBySlug = unstable_cache(
  async (slug: string) => {
    const parsed = parseIssueSlug(slug);
    if (!parsed) return null;
    const db = await getDb();
    const [cohort] = await db
      .select()
      .from(cohorts)
      .where(and(eq(cohorts.programme, "DAP"), eq(cohorts.slug, parsed.cohortSlug)));
    if (!cohort || cohort.visibility === "hidden") return null;
    const rows = await db
      .select()
      .from(issues)
      .where(and(eq(issues.cohortId, cohort.id), eq(issues.status, "published")))
      .orderBy(asc(issues.week));
    const issue = rows.find((r) => r.week === parsed.week);
    if (!issue) return null;
    return {
      cohort,
      issue: withSlug(issue, cohort.slug),
      siblings: rows.map((r) => withSlug(r, cohort.slug)),
      sessions: await listSessions(cohort.id),
    };
  },
  ["cms-public-issue"],
  { revalidate: 3600, tags: [TAGS.newsletter, TAGS.cohorts] }
);

export async function getPublicIssue(slug: string) {
  try {
    return await readIssueBySlug(slug);
  } catch (error) {
    console.error(`[cms] issue read failed for "${slug}"`, error);
    return null;
  }
}

