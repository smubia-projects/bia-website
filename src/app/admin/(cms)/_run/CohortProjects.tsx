"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import type { Cohort, Lodge, Track } from "@/app/lib/cms/cohorts";
import type { Project } from "@/app/projects/data/types";
import ProjectCover from "@/app/components/cms/ProjectCover";
import Medal from "@/app/components/cms/Medal";
import { trackAccent } from "@/app/components/cms/visuals";
import { PROJECT_STATUS_LABEL } from "@/app/lib/cms/taxonomy";
import { placeProjectAction, placeProjectsAction, setProjectLodgeAction, setWinnerAction } from "../../actions";
import { AddButton, ExternalAction, PageHead, PickerDialog, StatusChip, useActionToast, useConfirm, type PickerGroup } from "../../_components/ui";
import styles from "../../cms.module.css";

interface Props {
  cohort: Cohort;
  cohorts: Cohort[];
  tracks: Track[];
  lodges: Lodge[];
  /** Every project of this programme, any status */
  projects: Project[];
  canEdit: boolean;
  canSetWinner: boolean;
  /** The run's public yearbook page */
  publicHref: string;
}

interface Group {
  key: string;
  track: Track | null;
  title: string;
  accent: string;
  letter: string;
  projects: Project[];
}

/**
 * The semester's (or DAP cohort's) projects, grouped by track. Projects are added,
 * moved between tracks and marked as winners here; the editor handles everything else.
 */
export default function CohortProjects({ cohort, cohorts, tracks, lodges, projects, canEdit, canSetWinner, publicHref }: Props) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState<Group | null>(null);
  const isLodge = cohort.programme === "AI Lodge";
  const noun = isLodge ? "semester" : "cohort";
  const mine = projects.filter((p) => p.cohortId === cohort.id);
  const inTrack = (p: Project) => p.trackId && tracks.some((t) => t.id === p.trackId);
  const showLodge = isLodge && lodges.length > 0;
  const showTrack = isLodge && tracks.length > 0;

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
        { key: "none", track: null, title: tracks.length ? "No Track" : "Projects", accent: "", letter: "", projects: mine.filter((p) => !inTrack(p)) },
      ]
    : [{ key: "all", track: null, title: "Projects", accent: "", letter: "", projects: mine }];

  async function setLodge(p: Project, lodgeId: number | null) {
    setBusy(p.slug);
    handle(await setProjectLodgeAction(p.slug, lodgeId), lodgeId ? "Lodge set" : "Lodge removed");
    setBusy(null);
  }

  async function setTrack(p: Project, trackId: number | null) {
    setBusy(p.slug);
    handle(await placeProjectAction(p.slug, cohort.id, trackId), "Track changed");
    setBusy(null);
  }

  async function remove(p: Project) {
    const yes = await confirm({
      title: `Remove From ${isLodge ? "Semester" : "Cohort"}`,
      body: `${p.title} leaves ${cohort.name} and stays in All Projects without a ${noun}.`,
      action: "Remove Project",
      danger: true,
    });
    if (!yes) return;
    setBusy(p.slug);
    handle(await placeProjectAction(p.slug, null, null), `${p.title} removed from ${cohort.name}`);
    setBusy(null);
  }

  async function toggleWinner(p: Project, g: Group) {
    const next = !p.winner;
    const current = g.projects.find((x) => x.winner && x.slug !== p.slug);
    if (next && current) {
      const yes = await confirm({ title: "Replace Track Winner", body: `${p.title} replaces ${current.title} as the ${g.title} winner.`, action: "Replace Winner" });
      if (!yes) return;
    }
    setBusy(p.slug);
    handle(await setWinnerAction(p.slug, next), next ? `${p.title} set as ${g.title} winner` : "Winner removed");
    setBusy(null);
  }

  const cohortName = (id: string | null | undefined) => cohorts.find((c) => c.id === id)?.name ?? "";

  function pickerGroups(g: Group): PickerGroup[] {
    const item = (p: Project, meta: string) => ({ id: p.slug, title: p.title, meta: `${PROJECT_STATUS_LABEL[p.status ?? "draft"]}${meta ? ` · ${meta}` : ""}` });
    return [
      { label: "In This Semester", items: mine.filter((p) => !g.projects.includes(p)).map((p) => item(p, p.trackName ?? "No track")) },
      { label: isLodge ? "No Semester" : "No Cohort", items: projects.filter((p) => !p.cohortId).map((p) => item(p, "")) },
      {
        label: isLodge ? "Other Semesters" : "Other Cohorts",
        items: projects.filter((p) => p.cohortId && p.cohortId !== cohort.id).map((p) => item(p, cohortName(p.cohortId))),
      },
    ].filter((o) => o.items.length > 0);
  }

  async function addProjects(slugs: string[]) {
    if (!picking) return;
    setBusy("picker");
    const n = handle(await placeProjectsAction(slugs, cohort.id, picking.track?.id ?? null), `${slugs.length} ${slugs.length === 1 ? "project" : "projects"} added to ${picking.track ? picking.title : cohort.name}`);
    setBusy(null);
    if (n !== undefined) setPicking(null);
  }

  const newHref = (g: Group) => `/admin/projects/new?cohort=${cohort.id}${g.track ? `&track=${g.track.id}` : ""}`;

  return (
    <>
      <PageHead title="Projects" sub={isLodge ? "Yearbook projects by Hack Day track. Changes on this page save immediately." : "Projects on this cohort's yearbook. Changes on this page save immediately."}>
        {cohort.visibility !== "hidden" && <ExternalAction href={publicHref} label="View Yearbook" />}
        {canEdit && (
          <Link href={`/admin/projects/new?cohort=${cohort.id}`} className={styles.btn}>
            New Project
          </Link>
        )}
      </PageHead>

      <div className={styles.stack} style={{ marginTop: 22 }}>
        {groups.map((g) => {
          if (g.key === "none" && g.projects.length === 0 && tracks.length > 0) return null;
          const options = pickerGroups(g);
          const showWinner = Boolean(g.track && canSetWinner);
          const columns = [
            "minmax(200px, 1fr)",
            "96px",
            ...(showLodge ? ["180px"] : []),
            ...(showTrack ? ["220px"] : []),
            ...(showWinner ? ["136px"] : []),
            ...(canEdit ? ["34px"] : []),
          ].join(" ");
          return (
            <section key={g.key} className={styles.panel}>
              {(g.track || tracks.length > 0) && (
                <div className={styles.groupHead}>
                  {g.track && (
                    <span className={styles.trackLetter} style={{ background: g.accent, width: 28, height: 28, fontSize: 13 }}>
                      {g.letter}
                    </span>
                  )}
                  <h2 className={styles.h2}>{g.title}</h2>
                  <span className={styles.count}>{g.projects.length}</span>
                </div>
              )}

              {g.projects.length === 0 ? (
                <p className={styles.emptyInline}>No projects.</p>
              ) : (
                <div className={styles.placeScroll}>
                  <div className={styles.placeGrid} style={{ gridTemplateColumns: columns }}>
                    <span className={styles.monoLabel}>Project</span>
                    <span className={styles.monoLabel}>Status</span>
                    {showLodge && <span className={styles.monoLabel}>Lodge</span>}
                    {showTrack && <span className={styles.monoLabel}>Track</span>}
                    {showWinner && <span className={styles.monoLabel}>Hack Day</span>}
                    {canEdit && <span />}

                    {g.projects.map((p) => (
                      <div key={p.slug} className={styles.placeRow}>
                        <span className={styles.projectCell}>
                          <span className={styles.thumb} style={{ width: 44 }}>
                            <ProjectCover title={p.title} src={p.coverImage} aspect="52 / 34" monoSize={12} sizes="44px" />
                          </span>
                          <Link href={`/admin/projects/${p.slug}`} className={styles.projRowTitle}>
                            {p.title}
                          </Link>
                        </span>
                        <span>
                          <StatusChip status={p.status ?? "draft"} label={PROJECT_STATUS_LABEL[p.status ?? "draft"]} />
                        </span>
                        {showLodge && (
                          <select
                            className={`${styles.inp} ${styles.inpSmall}`}
                            aria-label={`Lodge for ${p.title}`}
                            value={p.lodgeId ?? ""}
                            disabled={!canEdit || busy === p.slug}
                            onChange={(e) => setLodge(p, e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">Not set</option>
                            {lodges.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {showTrack && (
                          <select
                            className={`${styles.inp} ${styles.inpSmall}`}
                            aria-label={`Track for ${p.title}`}
                            value={g.track?.id ?? ""}
                            disabled={!canEdit || busy === p.slug}
                            onChange={(e) => setTrack(p, e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">Not set</option>
                            {tracks.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {showWinner && (
                          <button
                            type="button"
                            className={`${styles.winnerBtn} ${p.winner ? styles.winnerBtnOn : ""}`}
                            aria-pressed={Boolean(p.winner)}
                            disabled={busy === p.slug}
                            onClick={() => toggleWinner(p, g)}
                            title={p.winner ? "Remove Hack Day winner" : `Set as ${g.title} winner`}
                          >
                            <Medal size={16} />
                            {p.winner ? "Winner" : "Set as Winner"}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className={styles.ico}
                            aria-label={`Remove ${p.title} from ${cohort.name}`}
                            title={p.status === "published" ? "Move to draft before removing" : `Remove from ${noun}`}
                            disabled={busy === p.slug || p.status === "published"}
                            onClick={() => remove(p)}
                          >
                            <X size={16} strokeWidth={1.75} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canEdit && (
                <div className={styles.row}>
                  <AddButton label="Add Existing Projects" disabled={options.length === 0} onClick={() => setPicking(g)} />
                  {g.track && (
                    <Link href={newHref(g)} className={styles.add}>
                      <Plus size={14} strokeWidth={2} aria-hidden="true" />
                      New Project in {g.title}
                    </Link>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {picking && (
        <PickerDialog
          title={`Add Projects to ${picking.track ? picking.title : cohort.name}`}
          sub={`Projects from another ${noun} move here, and their old public URLs redirect.`}
          groups={pickerGroups(picking)}
          busy={busy === "picker"}
          actionLabel={(n) => (n ? `Add ${n} ${n === 1 ? "Project" : "Projects"}` : "Add Projects")}
          onConfirm={addProjects}
          onClose={() => setPicking(null)}
        />
      )}
      {node}
    </>
  );
}
