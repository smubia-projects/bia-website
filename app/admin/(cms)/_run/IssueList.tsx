"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ISSUE_STATUS_LABEL, type IssueStatus } from "@/app/lib/cms/taxonomy";
import { createIssueAction } from "../../actions";
import { StatusChip, useActionToast } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

export interface IssueRowView {
  id: number;
  week: number;
  title: string;
  status: IssueStatus;
  session: string;
  goesOut: string;
  /** Public address, once published */
  path: string | null;
}

export default function IssueList({ cohortId, cohortSlug, rows }: { cohortId: string; cohortSlug: string; rows: IssueRowView[] }) {
  const base = runHref("DAP", cohortSlug, "newsletter");
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const id = handle(await createIssueAction(cohortId));
    setBusy(false);
    if (id) router.push(`${base}/${id}`);
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>This week in DAP</h1>
          <p className={styles.sub}>One issue per week. Each issue links to that week&apos;s co-learning session.</p>
        </div>
        <button type="button" className={styles.btn} onClick={create} disabled={busy}>
          New issue
        </button>
      </div>
      <div className={styles.tableWrap} style={{ marginTop: 20 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Issue</th>
              <th>Session</th>
              <th>Status</th>
              <th>Goes out</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={styles.projectCell}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--emerald)", width: 44 }}>W{r.week}</span>
                    <span className={styles.cellTitle}>{r.title}</span>
                  </span>
                </td>
                <td>{r.session}</td>
                <td>
                  <StatusChip status={r.status} label={ISSUE_STATUS_LABEL[r.status]} />
                </td>
                <td className={styles.editedCell}>{r.goesOut}</td>
                <td className={styles.actionsCell}>
                  {r.path && (
                    <a className={styles.lnk} href={r.path} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  )}
                  <Link className={styles.lnk} href={`${base}/${r.id}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.emptyRow}>No issues for this cohort yet.</p>}
      </div>
      {node}
    </>
  );
}
