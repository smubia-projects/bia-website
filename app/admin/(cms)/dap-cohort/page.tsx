import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { requireActorPage } from "@/app/lib/cms/session";
import CohortEditor from "../semester/CohortEditor";

export default async function DapCohortAdminPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const actor = await requireActorPage();
  if (!can.seeDap(actor)) notFound();
  const cohorts = await listCohorts("DAP");
  const cohort = cohorts.find((c) => c.id === searchParams.cohort) ?? pickCurrentCohort(cohorts);
  return (
    <CohortEditor
      key={cohort ? `${cohort.id}-${cohort.updatedAt}` : "none"}
      programme="DAP"
      cohorts={cohorts}
      cohort={cohort}
      tracks={[]}
      canEdit={can.editCohort(actor, "DAP")}
      basePath="/admin/dap-cohort"
      previewHref={cohort ? `/DAP/projects/${cohort.slug}` : "/DAP/projects"}
    />
  );
}
