"use client";

import { useState } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import type { Project } from "@/app/projects/data/types";
import ProjectTile from "./ProjectTile";
import ViewToggle from "./ViewToggle";
import { shuffle, visitSeed } from "./visuals";
import { useClientValue } from "@/app/components/ui/useClient";
import styles from "./public.module.css";

export interface Shelf {
  key: string;
  name: string;
  accent: string;
  projects: Project[];
}

type Layout = "grid" | "rows";

const LAYOUTS = [
  { value: "grid" as Layout, label: "Show every project", Icon: LayoutGrid },
  { value: "rows" as Layout, label: "One scrolling row per group", Icon: Rows3 },
];

function FilterRow({
  label,
  all,
  options,
  value,
  onChange,
}: {
  label: string;
  all: number;
  options: { key: string; name: string; count: number }[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  return (
    <div role="group" aria-label={`Filter by ${label.toLowerCase()}`} className={styles.filterRow}>
      <span className={styles.filterLabel}>{label}</span>
      <button type="button" className={`${styles.pill} ${styles.pillSmall} ${value === null ? styles.pillOn : ""}`} aria-pressed={value === null} onClick={() => onChange(null)}>
        All <span className={styles.pillNum}>{all}</span>
      </button>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`${styles.pill} ${styles.pillSmall} ${value === o.key ? styles.pillOn : ""}`}
          aria-pressed={value === o.key}
          disabled={o.count === 0 && value !== o.key}
          onClick={() => onChange(o.key)}
        >
          {o.name} <span className={styles.pillNum}>{o.count}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * A yearbook's projects: filter by group (Hack Day track or DAP area) and by
 * lodge, then every card in a grid or one scrolling row per group. Group and
 * project order is shuffled per visit so nobody is always first; a track's
 * winner leads its group.
 */
export default function YearbookShelves({
  shelves,
  groupLabel,
  lodges = [],
  hideBuiltWith = false,
}: {
  shelves: Shelf[];
  /** What the shelves are, for the filter row: "Track" or "Area" */
  groupLabel: string;
  lodges?: { id: number; name: string }[];
  /** The shelves are already grouped by Built With, so cards don't repeat it */
  hideBuiltWith?: boolean;
}) {
  const seed = useClientValue<number | null>(visitSeed, null);
  const [layout, setLayout] = useState<Layout>("grid");
  const [group, setGroup] = useState<string | null>(null);
  const [lodge, setLodge] = useState<string | null>(null);

  const inLodge = (p: Project, id: string | null) => id === null || String(p.lodgeId ?? "") === id;
  const everything = shelves.flatMap((s) => s.projects);
  const groupOptions = shelves.map((s) => ({ key: s.key, name: s.name, count: s.projects.filter((p) => inLodge(p, lodge)).length }));
  const scoped = group === null ? everything : shelves.find((s) => s.key === group)?.projects ?? [];
  const lodgeOptions = lodges
    .map((l) => ({ key: String(l.id), name: l.name, total: everything.filter((p) => p.lodgeId === l.id).length, count: scoped.filter((p) => p.lodgeId === l.id).length }))
    .filter((l) => l.total > 0);

  const ordered = (seed === null ? shelves : shuffle(shelves, seed))
    .filter((s) => group === null || s.key === group)
    .map((s) => {
      const mine = s.projects.filter((p) => inLodge(p, lodge));
      const mixed = seed === null ? mine : shuffle(mine, seed + 3);
      return { ...s, projects: [...mixed.filter((p) => p.winner), ...mixed.filter((p) => !p.winner)] };
    })
    .filter((s) => s.projects.length > 0);

  const shown = ordered.reduce((n, s) => n + s.projects.length, 0);
  const narrowed = group !== null || lodge !== null;
  const clear = () => {
    setGroup(null);
    setLodge(null);
  };

  return (
    <section className={styles.section} aria-labelledby="yearbook-projects">
      <div className={styles.shelvesBar}>
        <h2 id="yearbook-projects" className={styles.h2}>
          Projects
        </h2>
        <ViewToggle options={LAYOUTS} value={layout} onChange={setLayout} label="Layout" />
      </div>

      {(shelves.length > 1 || lodgeOptions.length > 0) && (
        <div className={styles.filterBar}>
          {shelves.length > 1 && <FilterRow label={groupLabel} all={everything.filter((p) => inLodge(p, lodge)).length} options={groupOptions} value={group} onChange={setGroup} />}
          {lodgeOptions.length > 0 && <FilterRow label="Lodge" all={scoped.length} options={lodgeOptions} value={lodge} onChange={setLodge} />}
        </div>
      )}

      {narrowed && (
        <div className={styles.activeRow} aria-live="polite">
          <span className={styles.resultText}>
            {shown} of {everything.length} projects
          </span>
          <button type="button" className={styles.lnkBtn} onClick={clear}>
            Clear filters
          </button>
        </div>
      )}

      {ordered.length === 0 ? (
        <div className={styles.empty}>No projects match these filters.</div>
      ) : (
        <div key={seed ?? "ssr"} className={styles.fadeIn}>
          {ordered.map((s) => (
            <section key={s.key} id={s.key} className={styles.shelf} aria-label={s.name}>
              {(shelves.length > 1 || s.name !== "Projects") && (
                <div className={styles.shelfHead}>
                  <span className={styles.shelfAccent} style={{ background: s.accent }} aria-hidden="true" />
                  <h3 className={styles.shelfTitle}>{s.name}</h3>
                  <span className={styles.shelfCount}>
                    {s.projects.length} {s.projects.length === 1 ? "project" : "projects"}
                  </span>
                </div>
              )}
              <div className={layout === "grid" ? styles.shelfGrid : styles.shelfRow}>
                {s.projects.map((p) => (
                  <ProjectTile key={p.slug} project={p} variant="shelf" showWinner hideBuiltWith={hideBuiltWith} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
