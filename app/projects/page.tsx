import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
        <h1 className={ui.h1} style={{ marginTop: 0 }}>
          Our <em>projects</em>
        </h1>

        {/* Suspense boundary required for useSearchParams inside the explorer */}
        <Suspense>
          <ProjectsExplorer projects={projects} />
        </Suspense>

        <div className={ui.yearbookFoot}>
          <Link href="/projects/ailodge" className={ui.pill}>
            AI Lodge yearbook
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <Link href="/projects/dap" className={ui.pill}>
            DAP yearbook
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <JoinCta
        programmes={["DAP", "AI Lodge"]}
        heading="Build a project with us"
        text="Join a programme and build a project to feature on this page."
      />
    </main>
  );
}
