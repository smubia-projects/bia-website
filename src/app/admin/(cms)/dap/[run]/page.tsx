import { can } from "@/app/lib/cms/actor";
import { dapRunPath } from "@/app/lib/cms/paths";
import CohortEditor from "../../_run/CohortEditor";
import { loadRun } from "../../_run/load";

export default async function CohortOverviewPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { actor, cohort } = await loadRun("DAP", params.run);
  return (
    <CohortEditor
      key={`${cohort.id}-${cohort.updatedAt}`}
      cohort={cohort}
      tracks={[]}
      canEdit={can.editCohort(actor, "DAP")}
      publicHref={dapRunPath(cohort.slug)}
    />
  );
}
