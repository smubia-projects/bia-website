import { sendMeetingReminders } from "@/app/lib/cms/bot";
import { publishDueIssues } from "@/app/lib/cms/newsletter";

/*
 * Daily Vercel Cron (vercel.json, 01:00 UTC = 09:00 SGT). Hobby-plan crons may
 * fire any time within that hour, which is why the editor says "±1 hour".
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 * Also sends the DAP tracker's 3-week meeting reminders.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.VERCEL) {
    return Response.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const published = await publishDueIssues();
  // Tracker meeting reminders ride on the same daily run; a failure there must not hide the newsletter result.
  const reminded = await sendMeetingReminders().catch((error) => {
    console.error("[cron] meeting reminders failed", error);
    return 0;
  });
  return Response.json({ published, reminded });
}
