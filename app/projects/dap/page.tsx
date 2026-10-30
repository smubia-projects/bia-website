import { getPublicCohorts } from "@/app/lib/cms/cohorts";
import { getPublicProjects } from "@/app/lib/projects";
import DapYearbookPage, { defaultDapCohort } from "./DapYearbookPage";

export const revalidate = 3600;

export const metadata = {
  title: "DAP projects | SMUBIA",
  description: "The DAP yearbook: machine learning projects built by each Data Associate Programme cohort.",
};

export default async function DapProjectsPage() {
  const [cohorts, all] = await Promise.all([getPublicCohorts("DAP"), getPublicProjects()]);
  const projects = all.filter((p) => p.badge === "DAP");
  return <DapYearbookPage cohort={defaultDapCohort(cohorts, projects)} cohorts={cohorts} projects={projects} />;
}
