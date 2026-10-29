import { notFound } from "next/navigation";
import ui from "@/app/components/cms/public.module.css";
import { usingLocalDb } from "@/app/lib/db";
import { getPublicProjects } from "@/app/lib/projects";
import ProjectDetailContent from "./ProjectDetailContent";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  // Next runs this in a separate worker; the local PGlite database can only be
  // opened by one process, so local dev renders project pages on demand.
  if (usingLocalDb()) return [];
  const projects = await getPublicProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const project = (await getPublicProjects()).find((p) => p.slug === params.slug);
  if (!project) return { title: "Project not found | SMUBIA" };
  return {
    title: `${project.title} | SMUBIA Projects`,
    description: project.description,
    openGraph: project.coverImage ? { images: [project.coverImage] } : undefined,
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const all = await getPublicProjects();
  const project = all.find((p) => p.slug === params.slug);
  if (!project) notFound();

  // "More from": same track, else same cohort, else same programme.
  const others = all.filter((p) => p.slug !== project.slug);
  const pools: [Project[], string | undefined][] = [
    [project.trackId ? others.filter((p) => p.trackId === project.trackId) : [], project.trackName],
    [project.cohortId ? others.filter((p) => p.cohortId === project.cohortId) : [], project.cohortName && `${project.badge} ${project.cohortName}`],
    [others.filter((p) => p.badge === project.badge), project.badge],
  ];
  const [related, relatedLabel] = pools.find(([list, label]) => list.length > 0 && label) ?? [[], ""];

  return (
    <main id="main-content" className={ui.page}>
      <ProjectDetailContent project={project} related={related.slice(0, 4)} relatedLabel={relatedLabel ?? ""} />
    </main>
  );
}

type Project = Awaited<ReturnType<typeof getPublicProjects>>[number];
