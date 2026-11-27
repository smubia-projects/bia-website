import { getPublicCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { getPublicProjects } from "@/app/lib/projects";
import LodgeYearbook from "./LodgeYearbook";

export const revalidate = 3600;

export const metadata = {
  title: "AI Lodge projects | SMUBIA",
  description: "The AI Lodge yearbook: every project from this semester's Hack Day, by track.",
};

export default async function AILodgeYearbookPage() {
  const [cohorts, projects] = await Promise.all([getPublicCohorts("AI Lodge"), getPublicProjects()]);
  // The live semester is the one recruiting or running; until its Hack Day has
  // projects, the yearbook keeps showing the newest semester that has some.
  const live = pickCurrentCohort(cohorts);
  const withProjects = cohorts.find((c) => projects.some((p) => p.cohortId === c.id));
  const cohort = live && projects.some((p) => p.cohortId === live.id) ? live : withProjects ?? live;
  return <LodgeYearbook cohort={cohort} cohorts={cohorts} projects={projects} />;
}
