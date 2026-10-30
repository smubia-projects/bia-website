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
  return <LodgeYearbook cohort={pickCurrentCohort(cohorts)} cohorts={cohorts} projects={projects} />;
}
