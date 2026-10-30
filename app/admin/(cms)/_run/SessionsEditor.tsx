"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ISSUE_STATUS_LABEL, type IssueStatus } from "@/app/lib/cms/taxonomy";
import { saveSessionsAction } from "../../actions";
import { StatusChip, useActionToast, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

interface Row {
  week: number;
  topic: string;
  groupId: number | null;
  slides: string;
  issue: IssueStatus | null;
}

export default function SessionsEditor({
  cohortId,
  cohortSlug,
  groups,
  initial,
}: {
  cohortId: string;
  cohortSlug: string;
  groups: { id: number; name: string }[];
  initial: Row[];
}) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  useUnsavedChanges(!saving && JSON.stringify(rows) !== JSON.stringify(initial));
  const patch = (week: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.week === week ? { ...r, ...p } : r)));

  async function save() {
    setSaving(true);
    const ok = handle(await saveSessionsAction(cohortId, rows.map(({ week, topic, groupId, slides }) => ({ week, topic, groupId, slides }))));
    setSaving(false);
    if (ok !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Co-learning schedule</h1>
          <p className={styles.sub}>
            Feeds the schedule on the cohort&apos;s page and the session box in each issue. Set up the teaching groups on{" "}
            <Link className={styles.lnk} style={{ padding: 0, minHeight: 0, fontSize: "inherit" }} href={runHref("DAP", cohortSlug, "groups")}>
              Groups
            </Link>
            .
          </p>
        </div>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save schedule"}
        </button>
      </div>
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
                  <select
                    className={`${styles.inp} ${styles.inpSmall}`}
                    value={r.groupId ?? ""}
                    aria-label={`Week ${r.week} teaching group`}
                    disabled={groups.length === 0}
                    onChange={(e) => patch(r.week, { groupId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">{groups.length ? "Not set" : "No groups yet"}</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
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
