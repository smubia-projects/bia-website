import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { getIssue, listIssues, listSessions } from "@/app/lib/cms/newsletter";
import { botUsername } from "@/app/lib/cms/telegram";
import IssueEditor from "../../../../_run/IssueEditor";
import { loadRun } from "../../../../_run/load";

export default async function IssueEditorPage({ params }: { params: { run: string; id: string } }) {
  const { actor, cohort } = await loadRun("DAP", params.run);
  if (!can.editNewsletter(actor)) notFound();
  const issue = await getIssue(Number(params.id));
  if (!issue || issue.cohortId !== cohort.id) notFound();
  const [sessions, siblings] = await Promise.all([listSessions(issue.cohortId), listIssues(issue.cohortId)]);
  return (
    <IssueEditor
      key={issue.updatedAt}
      cohortSlug={cohort.slug}
      issue={{
        id: issue.id,
        week: issue.week,
        title: issue.title,
        summary: issue.summary,
        coverImage: issue.coverImage,
        blocks: issue.blocks,
        status: issue.status,
        publishAt: issue.publishAt,
        postToTelegram: issue.postToTelegram,
        telegramPostedAt: issue.telegramPostedAt,
        path: issue.path,
      }}
      sessions={sessions.map((s) => ({ week: s.week, topic: s.topic, group: s.group?.name ?? "" }))}
      takenWeeks={siblings.map((s) => s.week)}
      botUsername={botUsername()}
      telegramReady={Boolean(process.env.TELEGRAM_BOT_TOKEN)}
    />
  );
}
