import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, listTracks, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { requireActorPage } from "@/app/lib/cms/session";
import CohortEditor from "./CohortEditor";

export default async function SemesterPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const actor = await requireActorPage();
  if (!can.seeLodge(actor)) notFound();
  const cohorts = await listCohorts("AI Lodge");
  const cohort = cohorts.find((c) => c.id === searchParams.cohort) ?? pickCurrentCohort(cohorts);
  const tracks = cohort ? await listTracks(cohort.id) : [];
  return (
    <CohortEditor
      key={cohort ? `${cohort.id}-${cohort.updatedAt}` : "none"}
      programme="AI Lodge"
      cohorts={cohorts}
      cohort={cohort}
      tracks={tracks}
      canEdit={can.editCohort(actor, "AI Lodge")}
      basePath="/admin/semester"
      previewHref={cohort && cohort.visibility !== "live" ? `/Projects/ai-lodge/${cohort.slug}` : "/Projects/ai-lodge"}
    />
  );
}
