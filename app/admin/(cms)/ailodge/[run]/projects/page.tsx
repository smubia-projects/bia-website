import { can } from "@/app/lib/cms/actor";
import { listLodges, listTracks } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { cohortPath } from "@/app/lib/cms/paths";
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
