import { ensureBotCommands, sendMeetingReminders } from "./bot";
import { publishDueIssues } from "./newsletter";
import { forgetExpiredCodes } from "./telegram-link";
import { forgetOldUpdates } from "./telegram-updates";

/*
 * The daily jobs run by /api/cron/daily. Each runs on its own: one failing never stops the
 * others. The result maps each job to what it returned, or "failed".
 */
export const DAILY_JOBS = {
  /** Newsletter issues whose scheduled time has passed */
  publishedIssues: () => publishDueIssues(),
  /** The tracker's 3-week mentor meeting reminders */
  meetingReminders: () => sendMeetingReminders(),
  /** The bot's "/" menus, if Telegram's differ from the command list */
  botCommands: () => ensureBotCommands(),
  /** Telegram update IDs older than two days */
  forgottenUpdates: () => forgetOldUpdates(),
  /** One-time Telegram link codes nobody used */
  expiredLinkCodes: () => forgetExpiredCodes(),
} satisfies Record<string, () => Promise<unknown>>;

export async function runDailyJobs(jobs: Record<string, () => Promise<unknown>> = DAILY_JOBS) {
  const results: Record<string, unknown> = {};
  let failed = false;
  for (const [name, job] of Object.entries(jobs)) {
    try {
      results[name] = await job();
    } catch (error) {
      failed = true;
      results[name] = "failed";
      console.error(`[cron] ${name} failed`, error);
    }
  }
  return { results, failed };
}
