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

type SortKey = "title" | "cohort" | "track" | "lodge" | "status" | "edited";
const SORT_VALUE: Record<SortKey, (p: Project) => string> = {
  title: (p) => p.title.toLowerCase(),
  cohort: (p) => `${p.badge} ${p.cohortName ?? "~"}`,
  track: (p) => p.trackName ?? "~",
  lodge: (p) => p.lodgeName ?? "~",
  status: (p) => p.status ?? "draft",
  edited: (p) => p.updatedAt ?? "",
};

type Filters = { tab: Tab; q: string; cohort: string; track: string; lodge: string };
const URL_KEY: Record<keyof Filters, string> = { tab: "status", q: "q", cohort: "cohort", track: "track", lodge: "lodge" };

export default function ProjectsTable({
  projects,
  subtitle,
  canApprove,
  cohorts,
  tracks,
  initialCohort,
  initialTrack,
  initialLodge,
  initialStatus,
  initialQuery,
}: {
  projects: Project[];
  subtitle: string;
  canApprove: boolean;
  cohorts: { id: string; name: string; programme: string }[];
  tracks: { id: number; name: string; cohortId: string }[];
  initialCohort: string;
  initialTrack: string;
  initialLodge: string;
  initialStatus: string;
  initialQuery: string;
}) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const defaultTab: Tab = canApprove && projects.some((p) => p.status === "in_review") ? "in_review" : "all";
  const trackCohort = tracks.find((t) => String(t.id) === initialTrack)?.cohortId ?? "";
  const [f, setF] = useState<Filters>({
    tab: TABS.some((t) => t.key === initialStatus) ? (initialStatus as Tab) : defaultTab,
    q: initialQuery,
    cohort: initialCohort || trackCohort,
    track: initialTrack,
    lodge: initialLodge,
  });
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "edited", dir: -1 });
  const [busy, setBusy] = useState<string | null>(null);

  /** Keeps the filters in the address, so reload, Back and shared links keep them. */
  function update(next: Partial<Filters>) {
    setF((s) => {
      const merged = { ...s, ...next };
      const url = new URL(window.location.href);
      for (const key of Object.keys(URL_KEY) as (keyof Filters)[]) {
        const value = key === "tab" && merged.tab === "all" ? "" : merged[key];
        if (value) url.searchParams.set(URL_KEY[key], value);
        else url.searchParams.delete(URL_KEY[key]);
      }
      window.history.replaceState(null, "", url);
      return merged;
    });
  }

  // Track and lodge choices follow the semester filter.
  const inRun = (cohortId: string | null | undefined) => !f.cohort || cohortId === f.cohort;
  const cohortName = (id: string) => cohorts.find((c) => c.id === id)?.name ?? "";
  const trackOptions = tracks.filter((t) => inRun(t.cohortId) && cohorts.some((c) => c.id === t.cohortId));
  const lodgeOptions = [
    ...new Map(
      projects.filter((p) => p.lodgeId && inRun(p.cohortId)).map((p) => [p.lodgeId!, { id: p.lodgeId!, name: p.lodgeName ?? "", cohortId: p.cohortId ?? "" }])
    ).values(),
  ];

  const query = f.q.trim().toLowerCase();
  const matches = (p: Project) =>
    (!f.cohort || (f.cohort === "none" ? !p.cohortId : p.cohortId === f.cohort)) &&
    (!f.track || String(p.trackId) === f.track) &&
    (!f.lodge || String(p.lodgeId) === f.lodge) &&
    (!query || `${p.title} ${p.trackName ?? ""} ${p.lodgeName ?? ""} ${p.cohortName ?? ""}`.toLowerCase().includes(query));
  const inFilters = projects.filter(matches);
  const rows = inFilters
    .filter((p) => f.tab === "all" || p.status === f.tab)
    .sort((a, b) => SORT_VALUE[sort.key](a).localeCompare(SORT_VALUE[sort.key](b)) * sort.dir);
  const filtered = f.tab !== "all" || Boolean(f.cohort || f.track || f.lodge || query);

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

  const showAILodge = cohorts.some((c) => c.programme === "AI Lodge");
  const notSet = <span className={styles.hint}>Not set</span>;

  return (
    <>
      <PageHead title="All Projects" sub={subtitle}>
        <Link href={f.cohort && f.cohort !== "none" ? `/admin/projects/new?cohort=${f.cohort}` : "/admin/projects/new"} className={styles.btn}>
          New Project
        </Link>
      </PageHead>

      <div className={styles.row} style={{ marginTop: 20 }}>
        {TABS.map((t) => {
          const n = t.key === "all" ? inFilters.length : inFilters.filter((p) => p.status === t.key).length;
          return (
            <button
              key={t.key}
              type="button"
              className={`${styles.pill} ${f.tab === t.key ? styles.pillOn : ""}`}
              aria-pressed={f.tab === t.key}
              onClick={() => update({ tab: t.key })}
            >
              {t.label} <span className={styles.count}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.row} style={{ marginTop: 12 }}>
        <select
          className={`${styles.inp} ${styles.inpPill}`}
          value={f.cohort}
          onChange={(e) => update({ cohort: e.target.value, track: "", lodge: "" })}
          aria-label="Filter by semester or cohort"
          style={{ width: "auto", maxWidth: 240 }}
        >
          <option value="">All semesters and cohorts</option>
          {["AI Lodge", "DAP"].map((prog) =>
            cohorts.some((c) => c.programme === prog) ? (
              <optgroup key={prog} label={prog === "AI Lodge" ? "AI Lodge semesters" : "DAP cohorts"}>
                {cohorts
                  .filter((c) => c.programme === prog)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ) : null
          )}
          <option value="none">No semester or cohort</option>
        </select>
        {showAILodge && (
          <>
            <select
              className={`${styles.inp} ${styles.inpPill}`}
              value={f.track}
              onChange={(e) => update({ track: e.target.value })}
              aria-label="Filter by Hack Day track"
              style={{ width: "auto", maxWidth: 220 }}
              disabled={trackOptions.length === 0}
            >
              <option value="">All tracks</option>
              {trackOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {f.cohort ? "" : ` (${cohortName(t.cohortId)})`}
                </option>
              ))}
            </select>
            <select
              className={`${styles.inp} ${styles.inpPill}`}
              value={f.lodge}
              onChange={(e) => update({ lodge: e.target.value })}
              aria-label="Filter by lodge"
              style={{ width: "auto", maxWidth: 220 }}
              disabled={lodgeOptions.length === 0}
            >
              <option value="">All lodges</option>
              {lodgeOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                  {f.cohort ? "" : ` (${cohortName(l.cohortId)})`}
                </option>
              ))}
            </select>
          </>
        )}
        <input
          className={`${styles.inp} ${styles.inpPill}`}
          type="search"
          placeholder="Search projects"
          value={f.q}
          onChange={(e) => update({ q: e.target.value })}
          aria-label="Search projects"
          style={{ maxWidth: 220, marginLeft: "auto" }}
        />
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {head("title", "Project")}
              {head("cohort", "Semester / Cohort")}
              {showAILodge && head("track", "Track")}
              {showAILodge && head("lodge", "Lodge")}
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
                <td>
                  {p.cohortName ?? notSet}
                  <div className={styles.hint}>{p.badge}</div>
                </td>
                {showAILodge && <td>{p.badge === "AI Lodge" ? p.trackName ?? notSet : <span className={styles.hint}>-</span>}</td>}
                {showAILodge && <td>{p.badge === "AI Lodge" ? p.lodgeName ?? notSet : <span className={styles.hint}>-</span>}</td>}
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
                    Open
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
              <button type="button" className={styles.pill} onClick={() => update({ tab: "all", cohort: "", track: "", lodge: "", q: "" })}>
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
