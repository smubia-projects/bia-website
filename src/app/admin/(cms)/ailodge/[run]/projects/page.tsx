import { can } from "@/server/core/permissions";
import { listLodges, listTracks } from "@/server/cohorts/cohorts";
import { listProjects } from "@/server/projects/projects";
import { cohortPath } from "@/shared/paths";
import CohortProjects from "../../../_run/CohortProjects";
import { loadRun } from "../../../_run/load";

export default async function SemesterProjectsPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { actor, cohorts, cohort } = await loadRun("AI Lodge", params.run);
  const [tracks, lodges, all] = await Promise.all([listTracks(cohort.id), listLodges(cohort.id), listProjects()]);
  return (
    <CohortProjects
      cohort={cohort}
      cohorts={cohorts}
      tracks={tracks}
      lodges={lodges}
      projects={all.filter((p) => p.badge === "AI Lodge")}
      canEdit={can.editCohort(actor, "AI Lodge")}
      canSetWinner={can.setWinner(actor)}
      publicHref={cohortPath("AI Lodge", cohort.slug)}
    />
  );
}
