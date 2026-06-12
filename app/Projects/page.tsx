import { Suspense } from "react";
import styles from "./Projects.module.css";
import { getProjects } from "@/app/lib/projects";
import ProjectsContent from "./ProjectsContent";

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = (await getProjects()).filter((p) => !p.hidden);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Suspense boundary required for useSearchParams inside ProjectsContent */}
        <Suspense>
          <ProjectsContent projects={projects} />
        </Suspense>
      </div>
    </main>
  );
}
