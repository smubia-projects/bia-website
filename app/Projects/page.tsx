import { Suspense } from "react";
import styles from "./Projects.module.css";
import { LINKS } from "@/app/lib/links";
import { getProjects } from "@/app/lib/projects";
import ProjectsContent from "./ProjectsContent";
import ProjectsHero from "./ProjectsHero";
import { MotionNextLink } from "@/app/components/ui/MotionElements";

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = (await getProjects()).filter((p) => !p.hidden);

  return (
    <main className={styles.page}>
      <ProjectsHero />

      <div className={styles.container}>
        {/* Suspense boundary required for useSearchParams inside ProjectsContent */}
        <Suspense>
          <ProjectsContent projects={projects} />
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
