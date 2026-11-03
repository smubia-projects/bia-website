"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Project } from "@/app/projects/data/types";
import ProjectCover from "@/app/components/cms/ProjectCover";
import Medal from "@/app/components/cms/Medal";
import { PROJECT_STATUS_LABEL, type ProjectStatus } from "@/app/lib/cms/taxonomy";
import { approveProjectAction } from "../../actions";
import { PageHead, StatusChip, formatEdited, useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";

type Tab = "all" | ProjectStatus;
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "in_review", label: "In Review" },
  { key: "draft", label: "Draft" },
];

type SortKey = "title" | "programme" | "cohort" | "status" | "edited";
const SORT_VALUE: Record<SortKey, (p: Project) => string> = {
  title: (p) => p.title.toLowerCase(),
  programme: (p) => p.badge,
  cohort: (p) => p.cohortName ?? "",
  status: (p) => p.status ?? "draft",
  edited: (p) => p.updatedAt ?? "",
};

export default function ProjectsTable({
  projects,
  subtitle,
  canApprove,
  trackFilter,
  cohorts,
  initialCohort,
  initialStatus,
  initialQuery,
}: {
  projects: Project[];
  subtitle: string;
  canApprove: boolean;
  trackFilter: { id: number; name: string } | null;
  cohorts: { id: string; name: string; programme: string }[];
  initialCohort: string;
  initialStatus: string;
  initialQuery: string;
}) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const defaultTab: Tab = canApprove && projects.some((p) => p.status === "in_review") ? "in_review" : "all";
  const [tab, setTabState] = useState<Tab>(TABS.some((t) => t.key === initialStatus) ? (initialStatus as Tab) : defaultTab);
  const [q, setQState] = useState(initialQuery);
  const [cohortId, setCohortState] = useState(initialCohort);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "edited", dir: -1 });
  const [busy, setBusy] = useState<string | null>(null);

  /** Keeps the filters in the address, so reload, Back and shared links keep them. */
  function syncUrl(next: { tab?: Tab; q?: string; cohort?: string }) {
    const url = new URL(window.location.href);
    const set = (key: string, value: string | undefined) => (value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    if (next.tab !== undefined) set("status", next.tab === "all" ? "" : next.tab);
    if (next.q !== undefined) set("q", next.q);
    if (next.cohort !== undefined) set("cohort", next.cohort);
    window.history.replaceState(null, "", url);
  }
  const setTab = (value: Tab) => {
    setTabState(value);
    syncUrl({ tab: value });
  };
  const setQ = (value: string) => {
    setQState(value);
    syncUrl({ q: value });
  };
  const setCohortId = (value: string) => {
    setCohortState(value);
    syncUrl({ cohort: value });
  };

  const query = q.trim().toLowerCase();
  const rows = projects
    .filter(
      (p) =>
        (tab === "all" || p.status === tab) &&
        (!cohortId || (cohortId === "none" ? !p.cohortId : p.cohortId === cohortId)) &&
        (!query || `${p.title} ${p.trackName ?? ""} ${p.cohortName ?? ""}`.toLowerCase().includes(query))
    )
    .sort((a, b) => SORT_VALUE[sort.key](a).localeCompare(SORT_VALUE[sort.key](b)) * sort.dir);
  const filtered = tab !== "all" || Boolean(cohortId) || Boolean(query);

  function clearFilters() {
    setTab("all");
    setCohortId("");
    setQ("");
  }

  async function approve(p: Project) {
    if (!(await confirm({ title: "Publish Project", body: `${p.title} appears on the public site immediately.`, action: "Publish Project" }))) return;
    setBusy(p.slug);
    handle(await approveProjectAction(p.slug), "Project published");
    setBusy(null);
  }

  const head = (key: SortKey, label: string) => {
    const on = sort.key === key;
    return (
      <th aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          className={styles.th}
          onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "edited" ? -1 : 1 }))}
        >
          {label}
          {on && (sort.dir === 1 ? <ArrowUp size={14} strokeWidth={1.75} aria-hidden="true" /> : <ArrowDown size={14} strokeWidth={1.75} aria-hidden="true" />)}
        </button>
      </th>
    );
  };

  return (
    <>
      <PageHead
        title="All Projects"
        sub={
          <>
            {subtitle}
            {trackFilter && (
              <>
                {" · "}Filtered to {trackFilter.name} ·{" "}
                <Link className={`${styles.lnk} ${styles.lnkInline}`} href="/admin/projects">
                  Clear Track Filter
                </Link>
              </>
            )}
          </>
        }
      >
        <Link href={cohortId && cohortId !== "none" ? `/admin/projects/new?cohort=${cohortId}` : "/admin/projects/new"} className={styles.btn}>
          New Project
        </Link>
      </PageHead>

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
          aria-label="Filter by semester or cohort"
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
          <option value="none">No semester or cohort</option>
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
              {head("title", "Project")}
              {head("programme", "Programme")}
              {head("cohort", "Semester / Cohort")}
              {head("status", "Status")}
              {head("edited", "Edited")}
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
                    <Link className={styles.projRowTitle} href={`/admin/projects/${p.slug}`}>
                      {p.title}
                    </Link>
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
                    <button
                      type="button"
                      className={styles.lnk}
                      onClick={() => approve(p)}
                      disabled={busy === p.slug || !p.cohortId}
                      title={p.cohortId ? undefined : "Semester or cohort required before publishing"}
                    >
                      Publish
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
        {rows.length === 0 && (
          <div className={styles.empty}>
            {filtered ? "No projects match the filters." : "No projects."}
            {filtered && (
              <button type="button" className={styles.pill} onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
      {node}
    </>
  );
}
