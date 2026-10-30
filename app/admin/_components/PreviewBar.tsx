import styles from "../cms.module.css";

/** Sticky banner on CMS preview pages, which render content that may not be public yet. */
export default function PreviewBar({ note, backHref, backLabel }: { note: string; backHref: string; backLabel: string }) {
  return (
    <div className={styles.previewBar} role="status">
      <span>
        <strong>Preview.</strong> {note}
      </span>
      <a href={backHref}>{backLabel}</a>
    </div>
  );
}
