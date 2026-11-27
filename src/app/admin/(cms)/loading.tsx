import styles from "../cms.module.css";

/** Shown while a CMS page loads from the database. */
export default function CmsLoading() {
  return (
    <div role="status" aria-label="Loading page">
      <div className={styles.skeleton} style={{ width: 240, height: 34 }} />
      <div className={styles.skeleton} style={{ height: 220, marginTop: 22 }} />
      <div className={styles.skeleton} style={{ height: 140, marginTop: 20 }} />
    </div>
  );
}
