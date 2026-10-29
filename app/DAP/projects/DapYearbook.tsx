"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Project } from "@/app/Projects/data/types";
import ProjectCover from "@/app/components/cms/ProjectCover";
import ProjectTile from "@/app/components/cms/ProjectTile";
import ui from "@/app/components/cms/public.module.css";

export interface DapShelf {
  name: string;
  projects: Project[];
}

/** DAP yearbook shelves (grouped by area); a card opens a quick-look dialog. */
export default function DapYearbook({ shelves }: { shelves: DapShelf[] }) {
  const [selected, setSelected] = useState<Project | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const live = selected?.liveUrl || selected?.demoUrl;

  return (
    <>
      {shelves.map((s) => (
        <section key={s.name} className={ui.shelf}>
          <div className={ui.label}>{s.name}</div>
          <h2 className={ui.shelfTitle}>
            {s.projects.length} {s.projects.length === 1 ? "project" : "projects"}
          </h2>
          <div className={ui.dapGrid}>
            {s.projects.map((p) => (
              <ProjectTile key={p.slug} project={p} variant="dap" onOpen={() => setSelected(p)} />
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <div className={ui.overlay} onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div role="dialog" aria-modal="true" aria-label={selected.title} className={ui.dialog}>
            <div className={ui.dialogMedia}>
              <ProjectCover title={selected.title} src={selected.coverImage} aspect="auto" monoSize={64} sizes="360px" className={ui.dialogCover} />
            </div>
            <div className={ui.dialogBody}>
              <span className={`${ui.progBadge} ${ui.progDap}`}>
                DAP{selected.builtWith ? ` · ${selected.builtWith}` : ""}
              </span>
              <h2 className={ui.dialogTitle}>{selected.title}</h2>
              {selected.description && (
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{selected.description}</p>
              )}
              <div className={ui.dialogActions}>
                {live && (
                  <a className={ui.btn} href={live} target="_blank" rel="noopener noreferrer">
                    Try it live
                  </a>
                )}
                <Link className={ui.pill} href={`/Projects/${selected.slug}`}>
                  View project
                </Link>
                <button type="button" className={ui.pill} onClick={() => setSelected(null)} autoFocus>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
