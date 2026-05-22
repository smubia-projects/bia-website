import styles from "./Projects.module.css";
import { getProjects } from "@/app/lib/projects";
import ProjectsContent from "./ProjectsContent";

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <ProjectsContent projects={projects} />
      </div>
    </main>
  );
}
