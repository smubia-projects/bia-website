import { formatIssueDate, listIssues, listSessions } from "@/app/lib/cms/newsletter";
import IssueList from "../../../_run/IssueList";
import { loadRun } from "../../../_run/load";

export default async function NewsletterAdminPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { cohort } = await loadRun("DAP", params.run);
  const [issues, sessions] = await Promise.all([listIssues(cohort.id), listSessions(cohort.id)]);
  const rows = issues.map((i) => {
    const s = sessions.find((x) => x.week === i.week);
    return {
      id: i.id,
      week: i.week,
      title: i.title,
      status: i.status,
      session: s?.topic ? `${s.topic}${s.group ? ` · ${s.group.name}` : ""}` : "No session set",
      path: i.status === "published" ? i.path : null,
      goesOut:
        i.status === "published"
          ? formatIssueDate(i.publishedAt)
          : i.status === "scheduled"
            ? `${formatIssueDate(i.publishAt)}, ~9am`
            : "Not scheduled",
    };
  });

  return <IssueList cohortId={cohort.id} cohortSlug={cohort.slug} rows={rows} />;
}
