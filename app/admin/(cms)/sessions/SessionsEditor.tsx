"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ISSUE_STATUS_LABEL, TEACHING_GROUPS, type IssueStatus } from "@/app/lib/cms/taxonomy";
import { saveSessionsAction } from "../../actions";
import { StatusChip, useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

interface Row {
  week: number;
  topic: string;
  group: string;
  slides: string;
  issue: IssueStatus | null;
}

export default function SessionsEditor({
  cohortId,
  cohorts,
  initial,
}: {
  cohortId: string;
  cohorts: { id: string; name: string }[];
  initial: Row[];
}) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const patch = (week: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.week === week ? { ...r, ...p } : r)));

  async function save() {
    setSaving(true);
    const ok = handle(await saveSessionsAction(cohortId, rows.map(({ week, topic, group, slides }) => ({ week, topic, group, slides }))));
    setSaving(false);
    if (ok !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Co-learning sessions</h1>
          <p className={styles.sub}>Feeds the schedule on the newsletter page and the session box in each issue.</p>
        </div>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save schedule"}
        </button>
      </div>
      {cohorts.length > 1 && (
        <div className={styles.row} style={{ marginTop: 18 }}>
          {cohorts.map((c) => (
            <Link key={c.id} href={`/admin/sessions?cohort=${c.id}`} className={`${styles.pill} ${c.id === cohortId ? styles.pillOn : ""}`}>
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <div className={styles.tableWrap} style={{ marginTop: 20 }}>
        <table className={styles.table} style={{ minWidth: 780 }}>
          <thead>
            <tr>
              <th>Week</th>
              <th>Topic</th>
              <th>Teaching group</th>
              <th>Slides link</th>
              <th>Issue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.week}>
                <td style={{ fontFamily: "var(--font-roboto-mono)", fontWeight: 600, color: "var(--ink)" }}>{r.week}</td>
                <td>
                  <input className={`${styles.inp} ${styles.inpSmall}`} value={r.topic} aria-label={`Week ${r.week} topic`} onChange={(e) => patch(r.week, { topic: e.target.value })} />
                </td>
                <td>
                  <select className={`${styles.inp} ${styles.inpSmall}`} value={r.group} aria-label={`Week ${r.week} teaching group`} onChange={(e) => patch(r.week, { group: e.target.value })}>
                    <option value="">Not set</option>
                    {TEACHING_GROUPS.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className={`${styles.inp} ${styles.inpSmall}`}
                    type="url"
                    value={r.slides}
                    placeholder="Google Slides or notebook link"
                    aria-label={`Week ${r.week} slides link`}
                    onChange={(e) => patch(r.week, { slides: e.target.value })}
                  />
                </td>
                <td>
                  <StatusChip status={r.issue ?? "none"} label={r.issue ? ISSUE_STATUS_LABEL[r.issue] : "No issue yet"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {node}
    </>
  );
}
