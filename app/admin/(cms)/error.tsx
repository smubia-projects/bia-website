"use client";

import styles from "../cms.module.css";

/** A page that failed to load keeps the sidebar and offers a retry. */
export default function CmsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.panel} role="alert">
      <h1 className={styles.h1}>Page Failed to Load</h1>
      <p className={styles.sectionHint}>The database or server did not respond. Retry, and check the server logs if the error persists.</p>
      <button type="button" className={styles.btn} style={{ alignSelf: "flex-start" }} onClick={reset}>
        Retry
      </button>
    </div>
  );
}
