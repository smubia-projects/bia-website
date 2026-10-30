import Link from "next/link";
import ui from "@/app/components/cms/public.module.css";
import { projectPath } from "@/app/lib/cms/paths";
import { getPublicProjects } from "@/app/lib/projects";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export const metadata = {
  title: "Projects have moved | SMUBIA",
  robots: { index: false, follow: true },
};

/**
 * Old project addresses (/Projects/<slug>). Project pages now live under their
 * semester or cohort, so this page points visitors to the new places instead.
 */
export default async function ProjectsMovedPage({ params }: { params: { slug: string } }) {
  const project = (await getPublicProjects()).find((p) => p.slug === params.slug.toLowerCase());

  return (
    <main id="main-content" className={ui.page}>
      <div className={ui.moved}>
        <div className={ui.eyebrowLine}>Projects</div>
        <h1 className={ui.h1}>Projects have moved</h1>
        <p className={ui.lede}>
          Project pages now live under the AI Lodge semester or DAP cohort they were built in.
          {project ? ` You can find ${project.title} at its new address.` : " Browse them by programme below."}
        </p>
        <div className={ui.row} style={{ marginTop: 28, gap: 10 }}>
          {project && (
            <Link href={projectPath(project)} className={ui.btn}>
              Go to {project.title}
            </Link>
          )}
          <Link href="/Projects/ai-lodge" className={project ? ui.pill : ui.btn}>
            AI Lodge projects
          </Link>
          <Link href="/DAP/projects" className={ui.pill}>
            DAP projects
          </Link>
          <Link href="/Projects" className={ui.pill}>
            All projects
          </Link>
        </div>
      </div>
    </main>
  );
}
