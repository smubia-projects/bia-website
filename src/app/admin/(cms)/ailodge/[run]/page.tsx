import { can } from "@/server/core/actor";
import { listTracks } from "@/server/cohorts/cohorts";
import { cohortPath } from "@/shared/paths";
import CohortEditor from "../../_run/CohortEditor";
import { loadRun } from "../../_run/load";

export default async function SemesterOverviewPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { actor, cohort } = await loadRun("AI Lodge", params.run);
  const tracks = await listTracks(cohort.id);
  return (
    <CohortEditor
      key={`${cohort.id}-${cohort.updatedAt}`}
      cohort={cohort}
      tracks={tracks}
      canEdit={can.editCohort(actor, "AI Lodge")}
      publicHref={cohortPath("AI Lodge", cohort.slug)}
    />
  );
}
