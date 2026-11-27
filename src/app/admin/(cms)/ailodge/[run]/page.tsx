import { can } from "@/app/lib/cms/actor";
import { listTracks } from "@/app/lib/cms/cohorts";
import { cohortPath } from "@/app/lib/cms/paths";
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
