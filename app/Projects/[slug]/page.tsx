import { notFound } from "next/navigation";
import styles from "./ProjectDetail.module.css";
import { getProjects } from "@/app/lib/projects";
import ProjectDetailContent from "./ProjectDetailContent";

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);

  if (!project) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <ProjectDetailContent project={project} />
      </div>
    </main>
  );
}
