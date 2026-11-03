"use client";

import { useState } from "react";
import Link from "next/link";
import { ISSUE_STATUS_LABEL, type IssueStatus } from "@/app/lib/cms/taxonomy";
import { saveSessionsAction } from "../../actions";
import { PageHead, StatusChip, UnsavedNote, useActionToast, useSaveShortcut, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

interface Row {
  week: number;
  topic: string;
  groupId: number | null;
  slides: string;
  issue: IssueStatus | null;
  issueId: number | null;
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
  const { handle, node } = useActionToast();
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(rows) !== JSON.stringify(saved);
  useUnsavedChanges(!saving && dirty);
  const patch = (week: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.week === week ? { ...r, ...p } : r)));

  async function save() {
    setSaving(true);
    const res = await saveSessionsAction(cohortId, rows.map(({ week, topic, groupId, slides }) => ({ week, topic, groupId, slides })));
    handle(res);
    if (res.ok) setSaved(rows);
    setSaving(false);
  }
  useSaveShortcut(save, dirty && !saving);

  return (
    <>
      <PageHead
        title="Schedule"
        sub={
          <>
            Co-learning sessions for the cohort page and each issue&apos;s session box. Groups are managed in{" "}
            <Link className={`${styles.lnk} ${styles.lnkInline}`} href={runHref("DAP", cohortSlug, "groups")}>
              Co-Learning Groups
            </Link>
            .
          </>
        }
      >
        <UnsavedNote show={dirty} onDiscard={() => setRows(saved)} />
        <button type="button" className={styles.btn} onClick={save} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save Schedule"}
        </button>
      </PageHead>
      <div className={styles.tableWrap} style={{ marginTop: 20 }}>
        <table className={styles.table} style={{ minWidth: 780 }}>
          <thead>
            <tr>
              <th>Week</th>
              <th>Topic</th>
              <th>Co-Learning Group</th>
              <th>Slides URL</th>
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
                    aria-label={`Week ${r.week} co-learning group`}
                    disabled={groups.length === 0}
                    onChange={(e) => patch(r.week, { groupId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">{groups.length ? "Not set" : "No groups"}</option>
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
                    placeholder="https://"
                    aria-label={`Week ${r.week} slides URL`}
                    onChange={(e) => patch(r.week, { slides: e.target.value })}
                  />
                </td>
                <td>
                  {r.issue && r.issueId ? (
                    <Link href={`${runHref("DAP", cohortSlug, "newsletter")}/${r.issueId}`} aria-label={`Edit week ${r.week} issue`}>
                      <StatusChip status={r.issue} label={ISSUE_STATUS_LABEL[r.issue]} />
                    </Link>
                  ) : (
                    <span className={styles.hint}>None</span>
                  )}
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
