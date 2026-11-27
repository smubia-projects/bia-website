import { runDailyJobs } from "@/server/jobs";

/*
 * Daily Vercel Cron (vercel.json, 01:00 UTC = 09:00 SGT). Hobby-plan crons may fire any time
 * within that hour, which is why the newsletter editor says "±1 hour". Vercel sends
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set. The jobs are listed in
 * src/server/jobs.ts; the answer is 500 when any of them failed, so it shows in the logs.
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
  const { results, failed } = await runDailyJobs();
  return Response.json(results, { status: failed ? 500 : 200 });
}
