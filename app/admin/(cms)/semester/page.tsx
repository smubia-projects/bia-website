import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, listLodges, listTracks, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { cohortPath, yearbookPath } from "@/app/lib/cms/paths";
import { requireActorPage } from "@/app/lib/cms/session";
import CohortEditor from "./CohortEditor";

export default async function SemesterPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const actor = await requireActorPage();
  if (!can.seeLodge(actor)) notFound();
  const [cohorts, all] = await Promise.all([listCohorts("AI Lodge"), listProjects()]);
  const projects = all.filter((p) => p.badge === "AI Lodge");
  const cohort = cohorts.find((c) => c.id === searchParams.cohort) ?? pickCurrentCohort(cohorts);
  const [tracks, lodges] = cohort ? await Promise.all([listTracks(cohort.id), listLodges(cohort.id)]) : [[], []];
  return (
    <CohortEditor
      key={cohort ? `${cohort.id}-${cohort.updatedAt}` : "none"}
      programme="AI Lodge"
      cohorts={cohorts}
      cohort={cohort}
      tracks={tracks}
      lodges={lodges}
      projects={projects}
      canEdit={can.editCohort(actor, "AI Lodge")}
      canSetWinner={can.setWinner(actor)}
      basePath="/admin/semester"
      previewHref={cohort ? cohortPath("AI Lodge", cohort.slug) : yearbookPath("AI Lodge")}
    />
  );
}
