import { notFound } from "next/navigation";
import { getPublicCohorts } from "@/app/lib/cms/cohorts";
import { getPublicProjects } from "@/app/lib/projects";
import LodgeYearbook from "../LodgeYearbook";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: { cohort: string } }) {
  const cohort = (await getPublicCohorts("AI Lodge")).find((c) => c.slug === params.cohort);
  if (!cohort) return { title: "AI Lodge projects | SMUBIA" };
  return { title: `AI Lodge ${cohort.name} | SMUBIA`, alternates: { canonical: `/projects/ailodge/${cohort.slug}` } };
}

export default async function AILodgeCohortPage({ params }: { params: { cohort: string } }) {
  const [cohorts, projects] = await Promise.all([getPublicCohorts("AI Lodge"), getPublicProjects()]);
  const cohort = cohorts.find((c) => c.slug === params.cohort);
  if (!cohort) notFound();
  return <LodgeYearbook cohort={cohort} cohorts={cohorts} projects={projects} />;
}
