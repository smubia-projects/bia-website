import { Suspense } from "react";
import Link from "next/link";
import ui from "@/app/components/cms/public.module.css";
import JoinCta from "@/app/components/cms/JoinCta";
import { getPublicProjects } from "@/app/lib/projects";
import ProjectsExplorer from "./ProjectsExplorer";

export const revalidate = 3600;

export const metadata = {
  title: "Projects | SMUBIA",
  description: "Every DAP and AI Lodge project built at SMUBIA, searchable by audience and technique.",
};

export default async function ProjectsPage() {
  const projects = await getPublicProjects();

  return (
    <main id="main-content" className={ui.page}>
      <div className={ui.main} style={{ paddingTop: 48, paddingBottom: 24 }}>
        <div className={ui.eyebrowLine}>All projects</div>
        <h1 className={ui.h1}>
          Our <em>projects</em>
        </h1>
        <div className={ui.row} style={{ marginTop: 20 }}>
          <Link href="/projects/ailodge" className={ui.pill}>
            AI Lodge yearbook →
          </Link>
          <Link href="/projects/dap" className={ui.pill}>
            DAP yearbook →
          </Link>
        </div>

        {/* Suspense boundary required for useSearchParams inside the explorer */}
        <Suspense>
          <ProjectsExplorer projects={projects} />
        </Suspense>
      </div>

      <JoinCta
        programmes={["DAP", "AI Lodge"]}
        heading="Want your project up here?"
        text="Join a programme, build something you are proud of, and we will showcase it right here."
      />
    </main>
  );
}
