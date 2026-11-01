import { listGroups } from "@/app/lib/cms/cohorts";
import { listIssues, listSessions } from "@/app/lib/cms/newsletter";
import SessionsEditor from "../../../_run/SessionsEditor";
import { loadRun } from "../../../_run/load";

export default async function SchedulePage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { cohort } = await loadRun("DAP", params.run);
  const [sessions, issues, groups] = await Promise.all([listSessions(cohort.id), listIssues(cohort.id), listGroups(cohort.id)]);
  return (
    <SessionsEditor
      key={cohort.id}
      cohortId={cohort.id}
      cohortSlug={cohort.slug}
      groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      initial={sessions.map((s) => ({
        week: s.week,
        topic: s.topic,
        groupId: s.groupId,
        slides: s.slides,
        issue: issues.find((i) => i.week === s.week)?.status ?? null,
      }))}
    />
  );
}
