"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project } from "@/app/Projects/data/types";
import ProjectCover from "@/app/components/cms/ProjectCover";
import Medal from "@/app/components/cms/Medal";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/app/lib/cms/taxonomy";
import { approveProjectAction } from "../../actions";
import { StatusChip, formatEdited, useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

type Tab = "all" | ProjectStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "in_review", label: "In review" },
  { key: "draft", label: "Draft" },
];

export default function ProjectsTable({
  projects,
  subtitle,
  canApprove,
  trackFilter,
  cohorts,
  initialCohort,
}: {
  projects: Project[];
  subtitle: string;
  canApprove: boolean;
  trackFilter: { id: number; name: string } | null;
  cohorts: { id: string; name: string; programme: string }[];
  initialCohort: string;
}) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [tab, setTab] = useState<Tab>(canApprove && projects.some((p) => p.status === "in_review") ? "in_review" : "all");
  const [q, setQ] = useState("");
  const [cohortId, setCohortId] = useState(initialCohort);
  const [busy, setBusy] = useState<string | null>(null);

  const query = q.trim().toLowerCase();
  const rows = projects.filter(
    (p) =>
      (tab === "all" || p.status === tab) &&
      (!cohortId || (cohortId === "none" ? !p.cohortId : p.cohortId === cohortId)) &&
      (!query || `${p.title} ${p.trackName ?? ""} ${p.cohortName ?? ""}`.toLowerCase().includes(query))
  );

  async function approve(slug: string) {
    setBusy(slug);
    const ok = handle(await approveProjectAction(slug), "Published");
    setBusy(null);
    if (ok !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Projects</h1>
          <p className={styles.sub}>
            {subtitle}
            {trackFilter && (
              <>
                {" · "}Showing {trackFilter.name} <Link className={styles.lnk} href="/admin/projects">Show all</Link>
              </>
            )}
          </p>
        </div>
        <Link href={cohortId && cohortId !== "none" ? `/admin/projects/new?cohort=${cohortId}` : "/admin/projects/new"} className={styles.btn}>
          New project
        </Link>
      </div>

      <div className={styles.row} style={{ marginTop: 20 }}>
        {TABS.map((t) => {
          const n = t.key === "all" ? projects.length : projects.filter((p) => p.status === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              className={`${styles.pill} ${tab === t.key ? styles.pillOn : ""}`}
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label} <span className={styles.count}>{n}</span>
            </button>
          );
        })}
        <select
          className={`${styles.inp} ${styles.inpPill}`}
          value={cohortId}
          onChange={(e) => setCohortId(e.target.value)}
          aria-label="Semester or cohort"
          style={{ marginLeft: "auto", width: "auto", maxWidth: 240 }}
        >
          <option value="">All semesters and cohorts</option>
          {["AI Lodge", "DAP"].map((prog) => (
            <optgroup key={prog} label={prog === "AI Lodge" ? "AI Lodge semesters" : "DAP cohorts"}>
              {cohorts
                .filter((c) => c.programme === prog)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
          <option value="none">No semester or cohort yet</option>
        </select>
        <input
          className={`${styles.inp} ${styles.inpPill}`}
          type="search"
          placeholder="Search projects"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search projects"
          style={{ maxWidth: 220 }}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Project</th>
              <th>Programme</th>
              <th>Semester / cohort</th>
              <th>Status</th>
              <th>Edited</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.slug}>
                <td>
                  <span className={styles.projectCell}>
                    <span className={styles.thumb}>
                      <ProjectCover title={p.title} src={p.coverImage} aspect="52 / 34" monoSize={13} sizes="52px" />
                    </span>
                    <span className={styles.cellTitle}>{p.title}</span>
                    {p.winner && <Medal size={16} label={`${p.trackName ?? "Track"} winner`} />}
                  </span>
                </td>
                <td>{p.badge}</td>
                <td>
                  {p.cohortName ? (
                    <>
                      {p.cohortName}
                      {p.trackName && <span className={styles.hint}> · {p.trackName}</span>}
                    </>
                  ) : (
                    <span className={styles.hint}>Not set</span>
                  )}
                </td>
                <td>
                  <StatusChip status={p.status ?? "draft"} label={PROJECT_STATUS_LABEL[p.status ?? "draft"]} />
                </td>
                <td className={styles.editedCell}>{formatEdited(p.updatedAt)}</td>
                <td className={styles.actionsCell}>
                  {canApprove && p.status === "in_review" && (
                    <button type="button" className={styles.lnk} onClick={() => approve(p.slug)} disabled={busy === p.slug}>
                      Approve
                    </button>
                  )}
                  <Link className={styles.lnk} href={`/admin/projects/${p.slug}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className={styles.emptyRow}>Nothing here yet.</p>}
      </div>
      {node}
    </>
  );
}
