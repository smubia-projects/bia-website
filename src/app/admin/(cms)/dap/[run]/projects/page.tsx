import { can } from "@/server/core/permissions";
import { listProjects } from "@/server/projects/projects";
import { cohortPath } from "@/shared/paths";
import CohortProjects from "@/app/admin/(cms)/_run/CohortProjects";
import { loadRun } from "@/app/admin/(cms)/_run/load";

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
