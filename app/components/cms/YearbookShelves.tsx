"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project } from "@/app/Projects/data/types";
import ProjectTile from "./ProjectTile";
import { shuffle, visitSeed } from "./visuals";
import styles from "./public.module.css";

export interface Shelf {
  key: string;
  name: string;
  accent: string;
  projects: Project[];
}

const shelfBlurb = (projects: Project[]) => {
  const counts = new Map<string, number>();
  for (const p of projects) if (p.builtWith) counts.set(p.builtWith, (counts.get(p.builtWith) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(" · ");
};

/**
 * One shelf per track, with a sticky "Jump to" bar. Track and project order is
 * shuffled per visit so nobody is always first; a track's winner leads its shelf.
 */
export default function YearbookShelves({
  shelves,
  searchHref,
}: {
  shelves: Shelf[];
  searchHref: string;
}) {
  const [seed, setSeed] = useState<number | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => setSeed(visitSeed()), []);

  const ordered = (seed === null ? shelves : shuffle(shelves, seed)).map((s) => {
    const mixed = seed === null ? s.projects : shuffle(s.projects, seed + 3);
    return { ...s, projects: [...mixed.filter((p) => p.winner), ...mixed.filter((p) => !p.winner)] };
  });

  return (
    <>
      <nav aria-label="Jump to track" className={styles.jumpNav}>
        <span className={styles.muted} style={{ marginRight: 4 }}>
          Jump to
        </span>
        {ordered.map((s) => (
          <a key={s.key} className={styles.pill} href={`#${s.key}`}>
            {s.name} · {s.projects.length}
          </a>
        ))}
        <Link className={`${styles.pill} ${styles.jumpNavEnd}`} href={searchHref}>
          Search all projects
        </Link>
      </nav>

      <div key={seed ?? "ssr"} className={styles.fadeIn}>
        {ordered.map((s) => {
          const expanded = Boolean(open[s.key]);
          return (
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
                {s.projects.length > 1 && (
                  <button
                    type="button"
                    className={styles.pill}
                    aria-expanded={expanded}
                    onClick={() => setOpen((o) => ({ ...o, [s.key]: !expanded }))}
                  >
                    {expanded ? "Show as a row" : `See all ${s.projects.length}`}
                  </button>
                )}
              </div>
              <div className={expanded ? styles.shelfGrid : styles.shelfRow}>
                {s.projects.map((p) => (
                  <ProjectTile key={p.slug} project={p} variant="shelf" />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
