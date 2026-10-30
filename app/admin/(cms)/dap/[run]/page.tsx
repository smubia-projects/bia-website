import { can } from "@/app/lib/cms/actor";
import { dapRunPath } from "@/app/lib/cms/paths";
import CohortEditor from "../../_run/CohortEditor";
import { loadRun } from "../../_run/load";

export default async function CohortOverviewPage({ params }: { params: { run: string } }) {
  const { actor, cohort } = await loadRun("DAP", params.run);
  return (
    <CohortEditor
      key={`${cohort.id}-${cohort.updatedAt}`}
      cohort={cohort}
      tracks={[]}
      lodges={[]}
      canEdit={can.editCohort(actor, "DAP")}
      publicHref={dapRunPath(cohort.slug)}
    />
  );
}
