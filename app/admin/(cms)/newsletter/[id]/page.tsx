import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { getIssue, issuePath, listIssues, listSessions } from "@/app/lib/cms/newsletter";
import { requireActorPage } from "@/app/lib/cms/session";
import { botUsername } from "@/app/lib/cms/telegram";
import IssueEditor from "../IssueEditor";

export default async function IssueEditorPage({ params }: { params: { id: string } }) {
  const actor = await requireActorPage();
  if (!can.editNewsletter(actor)) notFound();
  const issue = await getIssue(Number(params.id));
  if (!issue) notFound();
  const [sessions, siblings] = await Promise.all([listSessions(issue.cohortId), listIssues(issue.cohortId)]);
  return (
    <IssueEditor
      key={issue.updatedAt}
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
        path: issuePath(issue.cohortSlug, issue.week),
      }}
      sessions={sessions.map((s) => ({ week: s.week, topic: s.topic, group: s.group?.name ?? "" }))}
      takenWeeks={siblings.map((s) => s.week)}
      botUsername={botUsername()}
      telegramReady={Boolean(process.env.TELEGRAM_BOT_TOKEN)}
    />
  );
}
