import { can } from "@/app/lib/cms/actor";
import { listProjects } from "@/app/lib/cms/projects";
import { cohortPath } from "@/app/lib/cms/paths";
import CohortProjects from "../../../_run/CohortProjects";
import { loadRun } from "../../../_run/load";

export default async function CohortProjectsPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { actor, cohorts, cohort } = await loadRun("DAP", params.run);
  const all = await listProjects();
  return (
    <CohortProjects
      cohort={cohort}
      cohorts={cohorts}
      tracks={[]}
      lodges={[]}
      projects={all.filter((p) => p.badge === "DAP")}
      canEdit={can.editCohort(actor, "DAP")}
      canSetWinner={can.setWinner(actor)}
      publicHref={cohortPath("DAP", cohort.slug)}
    />
  );
}
