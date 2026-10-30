import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { cohortPath, yearbookPath } from "@/app/lib/cms/paths";
import { requireActorPage } from "@/app/lib/cms/session";
import CohortEditor from "../semester/CohortEditor";

export default async function DapCohortAdminPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const actor = await requireActorPage();
  if (!can.seeDap(actor)) notFound();
  const [cohorts, all] = await Promise.all([listCohorts("DAP"), listProjects()]);
  const projects = all.filter((p) => p.badge === "DAP");
  const cohort = cohorts.find((c) => c.id === searchParams.cohort) ?? pickCurrentCohort(cohorts);
  return (
    <CohortEditor
      key={cohort ? `${cohort.id}-${cohort.updatedAt}` : "none"}
      programme="DAP"
      cohorts={cohorts}
      cohort={cohort}
      tracks={[]}
      projects={projects}
      canEdit={can.editCohort(actor, "DAP")}
      canSetWinner={can.setWinner(actor)}
      basePath="/admin/dap-cohort"
      previewHref={cohort ? cohortPath("DAP", cohort.slug) : yearbookPath("DAP")}
    />
  );
}
