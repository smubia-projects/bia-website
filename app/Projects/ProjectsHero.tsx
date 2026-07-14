import styles from "./ProjectsHero.module.css";

export default function ProjectsHero() {
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
    </section>
  );
}
