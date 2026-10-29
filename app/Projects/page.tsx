import { Suspense } from "react";
import styles from "./Projects.module.css";
import ui from "@/app/components/cms/public.module.css";
import { LINKS } from "@/app/lib/links";
import { getPublicProjects } from "@/app/lib/projects";
import ProjectsExplorer from "./ProjectsExplorer";
import { MotionNextLink } from "@/app/components/ui/MotionElements";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = {
  title: "Projects | SMUBIA",
  description: "Every DAP and AI Lodge project built at SMUBIA, searchable by audience and technique.",
};

export default async function ProjectsPage() {
  const projects = await getPublicProjects();

  return (
    <main id="main-content" className={ui.page}>
      <div className={ui.main} style={{ paddingTop: 48 }}>
        <div className={ui.eyebrowLine}>All projects</div>
        <h1 className={ui.h1}>
          Our <em>projects</em>
        </h1>
        <p className={ui.lede}>
          Every DAP and AI Lodge project in one place. Filter by audience or by technique.
        </p>
        <div className={ui.row} style={{ marginTop: 20 }}>
          <Link href="/Projects/ai-lodge" className={ui.pill}>
            AI Lodge yearbook →
          </Link>
          <Link href="/DAP/projects" className={ui.pill}>
            DAP yearbook →
          </Link>
        </div>

        {/* Suspense boundary required for useSearchParams inside the explorer */}
        <Suspense>
          <ProjectsExplorer projects={projects} />
        </Suspense>
      </div>

      {/* Vibrant CTA band (full-bleed, dark pine) */}
      <section className={styles.ctaBand}>
        <div className={styles.ctaBandInner}>
          <h2 className={styles.ctaBandHeading}>Want your project up here?</h2>
          <p className={styles.ctaBandText}>
            Join a programme, build something you are proud of, and we will
            showcase it right here.
          </p>
          <div className={styles.ctaBandActions}>
            <MotionNextLink
              href={LINKS.dapTelegram}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtnDap}
              gleam
              hover={{
                y: -3,
                boxShadow:
                  "0 0 0 3px rgba(125, 215, 194, 0.16), 0 8px 36px -2px rgba(125, 215, 194, 0.6)",
              }}
            >
              Join DAP
            </MotionNextLink>
            <MotionNextLink
              href={LINKS.aiLodgeSignup}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtnLodge}
              gleam
              hover={{
                y: -3,
                boxShadow:
                  "0 0 0 3px rgba(255, 211, 146, 0.18), 0 8px 36px -2px rgba(255, 211, 146, 0.6)",
              }}
            >
              Join AI Lodge
            </MotionNextLink>
          </div>
        </div>
      </section>
    </main>
  );
}
