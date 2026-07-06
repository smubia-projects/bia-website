import { Suspense } from "react";
import Link from "next/link";
import styles from "./Projects.module.css";
import { getProjects } from "@/app/lib/projects";
import ProjectsContent from "./ProjectsContent";
import ProjectsHero from "./ProjectsHero";

export const revalidate = 3600;

export default async function ProjectsPage() {
  const projects = (await getProjects()).filter((p) => !p.hidden);

  return (
    <main className={styles.page}>
      {/* Flowing marquee hero (full-bleed) */}
      <ProjectsHero projects={projects} />

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
            <Link href="/DAP" className={styles.ctaBtnPrimary}>
              Join DAP
            </Link>
            <Link href="/AILodge" className={styles.ctaBtnSecondary}>
              Join AI Lodge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
