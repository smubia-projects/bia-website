import styles from "./ProjectsHero.module.css";
import ProjectsMarquee from "@/app/components/ProjectsMarquee";
import { Project } from "@/app/Projects/data/types";

interface Props {
  projects: Project[];
}

export default function ProjectsHero({ projects }: Props) {
  return (
    <section className={styles.hero} aria-label="Projects showcase">
      <div className={styles.intro}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Projects</span>
        </div>
        <h1 className={styles.heading}>
          Built at <span className={styles.headingAccent}>SMUBIA</span>
        </h1>
      </div>

      <ProjectsMarquee projects={projects} fadeLeft="var(--mint-soft)" />
    </section>
  );
}
