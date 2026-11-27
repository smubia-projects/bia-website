import { listGroups } from "@/server/dap/colearning-groups";
import { listIssues, listSessions } from "@/server/dap/newsletter";
import SessionsEditor from "@/app/admin/(cms)/_run/SessionsEditor";
import { loadRun } from "@/app/admin/(cms)/_run/load";

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
        issueId: issues.find((i) => i.week === s.week)?.id ?? null,
      }))}
    />
  );
}
