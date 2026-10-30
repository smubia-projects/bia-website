"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Rows3 } from "lucide-react";
import type { Project } from "@/app/projects/data/types";
import ProjectTile from "./ProjectTile";
import ViewToggle from "./ViewToggle";
import { shuffle, visitSeed } from "./visuals";
import styles from "./public.module.css";

export interface Shelf {
  key: string;
  name: string;
  accent: string;
  projects: Project[];
}

type Layout = "rows" | "grid";

const LAYOUTS = [
  { value: "rows" as Layout, label: "One row per track", Icon: Rows3 },
  { value: "grid" as Layout, label: "Show every project", Icon: LayoutGrid },
];

const shelfBlurb = (projects: Project[]) => {
  const counts = new Map<string, number>();
  for (const p of projects) if (p.builtWith) counts.set(p.builtWith, (counts.get(p.builtWith) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(" · ");
};

/**
 * One shelf per track: a scrolling row, or every card in a grid. Track and
 * project order is shuffled per visit so nobody is always first; a track's
 * winner leads its shelf.
 */
export default function YearbookShelves({ shelves }: { shelves: Shelf[] }) {
  const [seed, setSeed] = useState<number | null>(null);
  const [layout, setLayout] = useState<Layout>("rows");
  useEffect(() => setSeed(visitSeed()), []);

  const ordered = (seed === null ? shelves : shuffle(shelves, seed)).map((s) => {
    const mixed = seed === null ? s.projects : shuffle(s.projects, seed + 3);
    return { ...s, projects: [...mixed.filter((p) => p.winner), ...mixed.filter((p) => !p.winner)] };
  });

  return (
    <>
      <div className={styles.shelvesBar}>
        <span className={styles.label}>Projects by track</span>
        <ViewToggle options={LAYOUTS} value={layout} onChange={setLayout} label="Layout" />
      </div>

      <div key={seed ?? "ssr"} className={styles.fadeIn}>
        {ordered.map((s) => (
          <section key={s.key} id={s.key} className={styles.shelf}>
            <div className={styles.shelfHead}>
              <div>
                <div className={styles.label} style={{ color: s.accent }}>
                  {s.name}
                </div>
                <h2 className={styles.shelfTitle}>
                  {s.projects.length} {s.projects.length === 1 ? "project" : "projects"}
                </h2>
                {shelfBlurb(s.projects) && <p className={styles.shelfBlurb}>{shelfBlurb(s.projects)}</p>}
              </div>
            </div>
            <div className={layout === "grid" ? styles.shelfGrid : styles.shelfRow}>
              {s.projects.map((p) => (
                <ProjectTile key={p.slug} project={p} variant="shelf" showWinner />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
