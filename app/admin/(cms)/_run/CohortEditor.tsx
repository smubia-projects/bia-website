"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cohort, Lodge, Track } from "@/app/lib/cms/cohorts";
import { trackAccent } from "@/app/components/cms/visuals";
import type { CohortVisibility } from "@/app/lib/cms/taxonomy";
import { deleteTrackAction, moveTrackAction, saveCohortAction, saveTrackAction } from "../../actions";
import { useActionToast, useUnsavedChanges } from "../../_components/ui";
import styles from "../../cms.module.css";
import LodgesPanel from "./LodgesPanel";

interface Props {
  cohort: Cohort;
  tracks: Track[];
  lodges: Lodge[];
  canEdit: boolean;
  /** The run's public page */
  publicHref: string;
}

const VISIBILITY: { value: CohortVisibility; label: string }[] = [
  { value: "live", label: "Current: shown first on the site" },
  { value: "archived", label: "Past: still public" },
  { value: "hidden", label: "Hidden: not on the site" },
];

/** A run's overview: name, visibility and write-up, plus Hack Day tracks and lodges for AI Lodge. */
export default function CohortEditor({ cohort, tracks, lodges, canEdit, publicHref }: Props) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const isLodge = cohort.programme === "AI Lodge";
  const noun = isLodge ? "semester" : "cohort";
  const [form, setForm] = useState({
    name: cohort.name,
    visibility: cohort.visibility,
    headline: cohort.headline,
    writeup: cohort.writeup,
    hackDay: cohort.hackDay,
  });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<number, { name: string }>>({});
  const [newTrack, setNewTrack] = useState<{ name: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));
  useUnsavedChanges(
    !saving &&
      (form.name !== cohort.name || form.visibility !== cohort.visibility || form.headline !== cohort.headline || form.writeup !== cohort.writeup || form.hackDay !== cohort.hackDay)
  );

  async function save() {
    setSaving(true);
    const ok = handle(await saveCohortAction(cohort.id, { ...form, visibility: form.visibility as CohortVisibility }));
    setSaving(false);
    if (ok !== undefined) router.refresh();
  }

  async function saveTrack(input: { id?: number; name: string }) {
    const id = handle(await saveTrackAction({ ...input, cohortId: cohort.id }), "Track saved");
    if (id) {
      setEditing((e) => {
        const next = { ...e };
        if (input.id) delete next[input.id];
        return next;
      });
      setNewTrack(null);
      router.refresh();
    }
  }

  async function moveTrack(t: Track, direction: "up" | "down") {
    if (handle(await moveTrackAction(t.id, direction)) !== undefined) router.refresh();
  }

  async function removeTrack(t: Track) {
    if (!confirm(`Remove ${t.name}?`)) return;
    if (handle(await deleteTrackAction(t.id), "Track removed") !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>{cohort.name}</h1>
          <p className={styles.sub}>
            {isLodge
              ? "The semester's yearbook page: its write-up, Hack Day tracks and lodges. Add and arrange its projects under Projects."
              : "The cohort's details and write-up, shown on its yearbook page. Groups, the schedule and the newsletter each have their own page."}
          </p>
        </div>
        <div className={styles.row}>
          <a className={styles.pill} href={`/admin/preview/cohort/${cohort.id}`} target="_blank" rel="noopener noreferrer">
            Preview
          </a>
          {cohort.visibility !== "hidden" && (
            <a className={styles.pill} href={publicHref} target="_blank" rel="noopener noreferrer">
              View on site
            </a>
          )}
          <button type="button" className={styles.btn} onClick={save} disabled={!canEdit || saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className={styles.cols} style={{ marginTop: 22 }}>
          <section className={`${styles.colMain} ${styles.panel}`}>
            <div className={styles.grid2}>
              <label className={styles.fld}>
                {isLodge ? "Semester" : "Cohort"}
                <input className={styles.inp} value={form.name} onChange={(e) => set("name", e.target.value)} disabled={!canEdit} />
              </label>
              <label className={styles.fld}>
                Visibility
                <select className={styles.inp} value={form.visibility} onChange={(e) => set("visibility", e.target.value)} disabled={!canEdit}>
                  {VISIBILITY.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {isLodge && (
              <label className={styles.fld}>
                Headline
                <input className={styles.inp} value={form.headline} onChange={(e) => set("headline", e.target.value)} placeholder="One line that sums up the semester" disabled={!canEdit} />
              </label>
            )}
            <label className={styles.fld}>
              Write-up
              <textarea
                className={styles.inp}
                rows={7}
                value={form.writeup}
                onChange={(e) => set("writeup", e.target.value)}
                placeholder={isLodge ? "What the tracks explored, Hack Day highlights, anything that stood out" : "The kinds of models teams built and highlights from the final presentations"}
                disabled={!canEdit}
              />
              <span className={styles.hint}>Markdown supported. Shown under the yearbook header.</span>
            </label>
            {isLodge && (
              <label className={styles.fld}>
                Hack Day
                <input className={styles.inp} value={form.hackDay} onChange={(e) => set("hackDay", e.target.value)} placeholder="Date · Venue" disabled={!canEdit} />
              </label>
            )}
            <span className={styles.hint}>Only one {noun} is current at a time: making this one current moves the previous one to past.</span>
          </section>

          {isLodge && (
            <div className={styles.colSide} style={{ position: "static" }}>
            <section className={styles.panel} style={{ gap: 0 }}>
              <h2 className={styles.h2}>Hack Day tracks</h2>
              <p className={styles.hint} style={{ margin: "4px 0 14px", fontSize: 13 }}>
                The tracks teams entered at Hack Day. Each becomes a shelf with one winner. This order sets the shelf colours; the public page shuffles it per visitor.
              </p>
              {tracks.map((t, index) => {
                const edit = editing[t.id];
                return (
                  <div key={t.id} className={styles.trackRow}>
                    <span className={styles.trackLetter} style={{ background: trackAccent(t.position) }}>
                      {t.letter || t.name.charAt(0)}
                    </span>
                    {edit ? (
                      <span className={styles.trackText} style={{ gap: 6 }}>
                        <input className={`${styles.inp} ${styles.inpSmall}`} value={edit.name} aria-label="Track name" onChange={(e) => setEditing((s) => ({ ...s, [t.id]: { ...edit, name: e.target.value } }))} />
                        <span className={styles.row}>
                          <button type="button" className={styles.lnk} onClick={() => saveTrack({ id: t.id, ...edit })}>
                            Save
                          </button>
                          <button type="button" className={styles.lnk} onClick={() => setEditing((s) => { const n = { ...s }; delete n[t.id]; return n; })}>
                            Cancel
                          </button>
                          {t.projectCount === 0 && (
                            <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => removeTrack(t)}>
                              Remove
                            </button>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className={styles.trackText}>
                        <span className={styles.trackName}>{t.name}</span>
                        <span className={styles.hint}>
                          {t.projectCount} {t.projectCount === 1 ? "project" : "projects"}
                        </span>
                      </span>
                    )}
                    {!edit && canEdit && (
                      <>
                        <span className={styles.trackOrder}>
                          <button type="button" className={styles.ico} aria-label={`Move ${t.name} up`} disabled={index === 0} onClick={() => moveTrack(t, "up")}>
                            ↑
                          </button>
                          <button type="button" className={styles.ico} aria-label={`Move ${t.name} down`} disabled={index === tracks.length - 1} onClick={() => moveTrack(t, "down")}>
                            ↓
                          </button>
                        </span>
                        <button type="button" className={styles.lnk} onClick={() => setEditing((s) => ({ ...s, [t.id]: { name: t.name } }))}>
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {canEdit &&
                (newTrack ? (
                  <div className={styles.subItem} style={{ marginTop: 10 }}>
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={newTrack.name} placeholder="Track name, e.g. Agents" aria-label="Track name" onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} />
                    <span className={styles.row}>
                      <button type="button" className={styles.btn} disabled={!newTrack.name.trim()} onClick={() => saveTrack(newTrack)}>
                        Add track
                      </button>
                      <button type="button" className={styles.pill} onClick={() => setNewTrack(null)}>
                        Cancel
                      </button>
                    </span>
                  </div>
                ) : (
                  <button type="button" className={styles.add} style={{ marginTop: 10 }} onClick={() => setNewTrack({ name: "" })}>
                    + Track
                  </button>
                ))}
            </section>
            <LodgesPanel cohortId={cohort.id} lodges={lodges} canEdit={canEdit} />
            </div>
          )}
      </div>
      {node}
    </>
  );
}
