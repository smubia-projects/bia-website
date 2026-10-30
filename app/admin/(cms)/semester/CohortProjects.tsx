"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Cohort, Track } from "@/app/lib/cms/cohorts";
import type { Project } from "@/app/projects/data/types";
import ProjectCover from "@/app/components/cms/ProjectCover";
import Medal from "@/app/components/cms/Medal";
import { trackAccent } from "@/app/components/cms/visuals";
import { PROJECT_STATUS_LABEL } from "@/app/lib/cms/taxonomy";
import { placeProjectAction, setWinnerAction } from "../../actions";
import { StatusChip, useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

interface Props {
  cohort: Cohort;
  cohorts: Cohort[];
  tracks: Track[];
  /** Every project of this programme, any status */
  projects: Project[];
  canEdit: boolean;
  canSetWinner: boolean;
}

interface Group {
  key: string;
  track: Track | null;
  title: string;
  accent: string;
  letter: string;
  projects: Project[];
}

const OUT = "__out";

/**
 * The semester's (or DAP cohort's) projects, grouped by track. Projects are added,
 * moved between tracks and marked as winners here; the editor handles everything else.
 */
export default function CohortProjects({ cohort, cohorts, tracks, projects, canEdit, canSetWinner }: Props) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [busy, setBusy] = useState<string | null>(null);
  const isLodge = cohort.programme === "AI Lodge";
  const noun = isLodge ? "semester" : "cohort";
  const mine = projects.filter((p) => p.cohortId === cohort.id);
  const inTrack = (p: Project) => p.trackId && tracks.some((t) => t.id === p.trackId);

  const groups: Group[] = isLodge
    ? [
        ...tracks.map((t) => ({
          key: `t${t.id}`,
          track: t,
          title: t.name,
          accent: trackAccent(t.position),
          letter: t.letter || t.name.charAt(0),
          projects: mine.filter((p) => p.trackId === t.id),
        })),
        {
          key: "none",
          track: null,
          title: tracks.length ? "Not in a track" : "Projects",
          accent: "#8aa39a",
          letter: "–",
          projects: mine.filter((p) => !inTrack(p)),
        },
      ]
    : [{ key: "all", track: null, title: "Projects", accent: "#0e7c5b", letter: "D", projects: mine }];

  async function place(slug: string, trackId: number | null, cohortId: string | null = cohort.id, message?: string) {
    setBusy(slug);
    const ok = handle(await placeProjectAction(slug, cohortId, trackId), message ?? "Project moved");
    setBusy(null);
    if (ok !== undefined) router.refresh();
  }

  async function toggleWinner(p: Project) {
    setBusy(p.slug);
    const next = !p.winner;
    const ok = handle(await setWinnerAction(p.slug, next), next ? `${p.title} is the ${p.trackName ?? "track"} winner` : "Winner removed");
    setBusy(null);
    if (ok !== undefined) router.refresh();
  }

  const cohortName = (id: string | null | undefined) => cohorts.find((c) => c.id === id)?.name ?? "";
  const addOptions = (g: Group) => {
    const here = mine.filter((p) => !g.projects.includes(p));
    const loose = projects.filter((p) => !p.cohortId);
    const elsewhere = projects.filter((p) => p.cohortId && p.cohortId !== cohort.id);
    return [
      { label: `Elsewhere in this ${noun}`, items: here },
      { label: isLodge ? "No semester yet" : "No cohort yet", items: loose },
      { label: isLodge ? "Other semesters" : "Other cohorts", items: elsewhere },
    ].filter((o) => o.items.length > 0);
  };
  const newHref = (g: Group) => `/admin/projects/new?cohort=${cohort.id}${g.track ? `&track=${g.track.id}` : ""}`;

  return (
    <section className={styles.panel} style={{ marginTop: 22 }}>
      <div className={styles.between} style={{ flexWrap: "wrap" }}>
        <div>
          <h2 className={styles.h2}>Projects in this {noun}</h2>
          <p className={styles.hint} style={{ margin: "4px 0 0", fontSize: 13 }}>
            {isLodge
              ? "Projects show on the semester page under their track. Add existing projects here, or start a new one in a track."
              : "Projects show on this cohort's yearbook page. Add existing projects here, or start a new one."}
          </p>
        </div>
        {canEdit && (
          <Link href={`/admin/projects/new?cohort=${cohort.id}`} className={styles.btn}>
            New project
          </Link>
        )}
      </div>

      {groups.map((g) => {
        const options = addOptions(g);
        if (g.key === "none" && g.projects.length === 0 && tracks.length > 0) return null;
        return (
          <div key={g.key} className={styles.groupBox}>
            <div className={styles.groupHead}>
              <span className={styles.trackLetter} style={{ background: g.accent, width: 28, height: 28, fontSize: 13 }}>
                {g.letter}
              </span>
              <span className={styles.trackName}>{g.title}</span>
              <span className={styles.count}>
                {g.projects.length} {g.projects.length === 1 ? "project" : "projects"}
              </span>
            </div>

            {g.projects.map((p) => (
              <div key={p.slug} className={styles.projRow}>
                <span className={styles.thumb} style={{ width: 44 }}>
                  <ProjectCover title={p.title} src={p.coverImage} aspect="52 / 34" monoSize={12} sizes="44px" />
                </span>
                <Link href={`/admin/projects/${p.slug}`} className={styles.projRowTitle}>
                  {p.title}
                </Link>
                <StatusChip status={p.status ?? "draft"} label={PROJECT_STATUS_LABEL[p.status ?? "draft"]} />
                {isLodge && g.track && canSetWinner && (
                  <button
                    type="button"
                    className={`${styles.winnerBtn} ${p.winner ? styles.winnerBtnOn : ""}`}
                    aria-pressed={Boolean(p.winner)}
                    disabled={busy === p.slug}
                    onClick={() => toggleWinner(p)}
                    title={p.winner ? "Hack Day winner. Click to remove." : `Make this the ${g.title} winner`}
                  >
                    <Medal size={16} />
                    {p.winner ? "Winner" : "Make winner"}
                  </button>
                )}
                {canEdit && (
                  <select
                    className={`${styles.inp} ${styles.inpSmall} ${styles.projRowMove}`}
                    aria-label={`Move ${p.title}`}
                    value={isLodge ? String(g.track?.id ?? "") : ""}
                    disabled={busy === p.slug}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === OUT) place(p.slug, null, null, `Removed from this ${noun}`);
                      else place(p.slug, v ? Number(v) : null);
                    }}
                  >
                    {isLodge &&
                      tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    <option value="">{isLodge ? "No track" : "In this cohort"}</option>
                    <option value={OUT}>Remove from {noun}</option>
                  </select>
                )}
              </div>
            ))}

            {canEdit && (
              <div className={styles.row} style={{ marginTop: 8 }}>
                {options.length > 0 && (
                  <select
                    className={`${styles.inp} ${styles.inpSmall}`}
                    style={{ flex: "1 1 220px", maxWidth: 340 }}
                    aria-label={`Add a project to ${g.title}`}
                    value=""
                    onChange={(e) => e.target.value && place(e.target.value, g.track?.id ?? null, cohort.id, `Added to ${g.title}`)}
                  >
                    <option value="">{g.track ? `Add a project to ${g.title}…` : "Add a project…"}</option>
                    {options.map((o) => (
                      <optgroup key={o.label} label={o.label}>
                        {o.items.map((p) => (
                          <option key={p.slug} value={p.slug}>
                            {p.title}
                            {o.label.startsWith("Other") ? ` (${cohortName(p.cohortId)})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
                {g.track && (
                  <Link href={newHref(g)} className={styles.add}>
                    + New project in {g.title}
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
      {node}
    </section>
  );
}
