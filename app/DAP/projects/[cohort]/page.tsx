import { notFound } from "next/navigation";
import { getPublicCohorts } from "@/app/lib/cms/cohorts";
import { getPublicProjects } from "@/app/lib/projects";
import DapYearbookPage from "../DapYearbookPage";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: { cohort: string } }) {
  const cohort = (await getPublicCohorts("DAP")).find((c) => c.slug === params.cohort);
  if (!cohort) return { title: "DAP projects | SMUBIA" };
  return { title: `DAP ${cohort.name} | SMUBIA`, alternates: { canonical: `/DAP/projects/${cohort.slug}` } };
}

export default async function DapCohortPage({ params }: { params: { cohort: string } }) {
  const [cohorts, all] = await Promise.all([getPublicCohorts("DAP"), getPublicProjects()]);
  const projects = all.filter((p) => p.badge === "DAP");
  const cohort = cohorts.find((c) => c.slug === params.cohort);
  if (!cohort) notFound();
  return <DapYearbookPage cohort={cohort} cohorts={cohorts} projects={projects} />;
}
