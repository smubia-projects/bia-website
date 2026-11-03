"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Cohort, Track } from "@/app/lib/cms/cohorts";
import type { TimelineStep } from "@/app/lib/db/schema";
import { trackAccent } from "@/app/components/cms/visuals";
import type { CohortVisibility } from "@/app/lib/cms/taxonomy";
import { deleteTrackAction, moveTrackAction, saveCohortAction, saveTrackAction } from "../../actions";
import { AddButton, ExternalAction, MarkdownHint, OrderButtons, PageHead, UnsavedNote, useActionToast, useConfirm, useSaveShortcut, useUnsavedChanges } from "../../_components/ui";
import styles from "../../cms.module.css";

interface Props {
  cohort: Cohort;
  tracks: Track[];
  canEdit: boolean;
  /** The run's public page */
  publicHref: string;
}

const VISIBILITY: { value: CohortVisibility; label: string }[] = [
  { value: "live", label: "Current: listed first on the site" },
  { value: "archived", label: "Past: public" },
  { value: "hidden", label: "Hidden: not public" },
];

const DEFAULT_TIMELINE: TimelineStep[] = [
  { label: "Applications open", date: "" },
  { label: "Applications close", date: "" },
  { label: "Interviews begin", date: "" },
  { label: "Interviews end", date: "" },
];

/** A run's overview: name, visibility and write-up, plus Hack Day tracks and the applications timeline for AI Lodge. */
export default function CohortEditor({ cohort, tracks, canEdit, publicHref }: Props) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const isLodge = cohort.programme === "AI Lodge";
  const noun = isLodge ? "semester" : "cohort";
  const [form, setForm] = useState({
    name: cohort.name,
    visibility: cohort.visibility,
    headline: cohort.headline,
    writeup: cohort.writeup,
    hackDay: cohort.hackDay,
    shortName: cohort.shortName,
    revealNote: cohort.revealNote,
  });
  const [timeline, setTimeline] = useState<TimelineStep[]>(cohort.timeline);
  const setStep = (i: number, p: Partial<TimelineStep>) => setTimeline((t) => t.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Record<number, { name: string }>>({});
  const [newTrack, setNewTrack] = useState<{ name: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const dirty =
    form.name !== cohort.name ||
    form.visibility !== cohort.visibility ||
    form.headline !== cohort.headline ||
    form.writeup !== cohort.writeup ||
    form.hackDay !== cohort.hackDay ||
    form.shortName !== cohort.shortName ||
    form.revealNote !== cohort.revealNote ||
    JSON.stringify(timeline) !== JSON.stringify(cohort.timeline);
  useUnsavedChanges(!saving && dirty);

  async function save() {
    setSaving(true);
    handle(
      await saveCohortAction(cohort.id, { ...form, visibility: form.visibility as CohortVisibility, ...(isLodge ? { timeline } : {}) })
    );
    setSaving(false);
  }

  useSaveShortcut(save, canEdit && dirty && !saving);

  function discard() {
    setForm({
      name: cohort.name,
      visibility: cohort.visibility,
      headline: cohort.headline,
      writeup: cohort.writeup,
      hackDay: cohort.hackDay,
      shortName: cohort.shortName,
      revealNote: cohort.revealNote,
    });
    setTimeline(cohort.timeline);
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
    }
  }

  async function moveTrack(t: Track, direction: "up" | "down") {
    handle(await moveTrackAction(t.id, direction));
  }

  async function removeTrack(t: Track) {
    if (!(await confirm({ title: "Remove Track", body: `${t.name} is removed from this semester.`, action: "Remove Track", danger: true }))) return;
    handle(await deleteTrackAction(t.id), "Track removed");
  }

  return (
    <>
      <PageHead title="Overview">
        <UnsavedNote show={dirty} onDiscard={discard} />
        <ExternalAction href={`/admin/preview/cohort/${cohort.id}`} label="Preview" />
        {cohort.visibility !== "hidden" && <ExternalAction href={publicHref} label="View Public Page" />}
        <button type="button" className={styles.btn} onClick={save} disabled={!canEdit || saving || !dirty}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </PageHead>

      <div className={styles.cols} style={{ marginTop: 22 }}>
          <section className={`${styles.colMain} ${styles.panel}`}>
            <div className={styles.grid2}>
              <label className={styles.fld}>
                {isLodge ? "Semester Name" : "Cohort Name"}
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
                <span className={styles.hint}>One {noun} can be current. Setting this one moves the previous {noun} to past.</span>
              </label>
            </div>
            {isLodge && (
              <label className={styles.fld}>
                Headline
                <input className={styles.inp} value={form.headline} onChange={(e) => set("headline", e.target.value)} disabled={!canEdit} />
              </label>
            )}
            <label className={styles.fld}>
              Write-up
              <textarea
                className={styles.inp}
                rows={7}
                value={form.writeup}
                onChange={(e) => set("writeup", e.target.value)}
                disabled={!canEdit}
              />
              <MarkdownHint>Shown under the yearbook header.</MarkdownHint>
            </label>
            {isLodge && (
              <label className={styles.fld}>
                Hack Day Date and Venue
                <input className={styles.inp} value={form.hackDay} onChange={(e) => set("hackDay", e.target.value)} placeholder="Date · Venue" disabled={!canEdit} />
              </label>
            )}
            {isLodge && (
              <div className={styles.grid2}>
                <label className={styles.fld}>
                  AI Lodge Site Name
                  <input className={styles.inp} value={form.shortName} onChange={(e) => set("shortName", e.target.value)} placeholder="Fall 2026" disabled={!canEdit} />
                  <span className={styles.hint}>Shown as &quot;Fall 2026 cohort&quot;. Empty uses the {noun} name.</span>
                </label>
                <label className={styles.fld}>
                  Lodge Details Release
                  <input className={styles.inp} value={form.revealNote} onChange={(e) => set("revealNote", e.target.value)} placeholder="soon" disabled={!canEdit} />
                  <span className={styles.hint}>Completes &quot;Details drop …&quot; on unreleased lodges, for example &quot;soon&quot; or &quot;26 Oct&quot;.</span>
                </label>
              </div>
            )}
            {isLodge && (
              <fieldset className={styles.fieldset} style={{ gap: 8, marginTop: 8 }}>
                <legend className={styles.legend}>Applications Timeline</legend>
                <span className={styles.hint}>Shown as &quot;Save the dates&quot; on the AI Lodge site.</span>
                {timeline.length > 0 && (
                  <div className={styles.timelineHead}>
                    <span>Step</span>
                    <span>Date</span>
                    <span>Note</span>
                    <span>Deadline</span>
                    <span />
                  </div>
                )}
                {timeline.map((t, i) => (
                  <div key={i} className={styles.timelineRow}>
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={t.label} aria-label="Step" disabled={!canEdit} onChange={(e) => setStep(i, { label: e.target.value })} />
                    <input className={`${styles.inp} ${styles.inpSmall}`} type="date" value={t.date} aria-label={`${t.label || "Step"} date`} disabled={!canEdit} onChange={(e) => setStep(i, { date: e.target.value })} />
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={t.note ?? ""} placeholder="Optional" aria-label="Note" disabled={!canEdit} onChange={(e) => setStep(i, { note: e.target.value })} />
                    <label className={styles.radio} style={{ justifyContent: "center" }}>
                      <input type="checkbox" aria-label={`${t.label || "Step"} is a deadline`} checked={Boolean(t.deadline)} disabled={!canEdit} onChange={(e) => setStep(i, { deadline: e.target.checked || undefined })} />
                    </label>
                    {canEdit && (
                      <button type="button" className={styles.ico} aria-label={`Remove ${t.label || "step"}`} onClick={() => setTimeline((s) => s.filter((_, j) => j !== i))}>
                        <X size={16} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && <AddButton label="Add Step" onClick={() => setTimeline((s) => (s.length ? [...s, { label: "", date: "" }] : DEFAULT_TIMELINE))} />}
              </fieldset>
            )}
          </section>

          {isLodge && (
            <div className={styles.colSide} style={{ position: "static" }}>
            <section className={styles.panel} style={{ gap: 0 }}>
              <h2 className={styles.h2}>Hack Day Tracks</h2>
              <p className={styles.sectionHint} style={{ margin: "4px 0 14px" }}>
                One yearbook shelf and one winner per track. Order sets shelf colours; the public page shuffles the display order. Changes in this panel save immediately.
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
                        <OrderButtons index={index} count={tracks.length} label={t.name} onMove={(dir) => moveTrack(t, dir === -1 ? "up" : "down")} />
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
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={newTrack.name} placeholder="Track name" aria-label="Track name" onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} />
                    <span className={styles.row}>
                      <button type="button" className={styles.btn} disabled={!newTrack.name.trim()} onClick={() => saveTrack(newTrack)}>
                        Add Track
                      </button>
                      <button type="button" className={styles.pill} onClick={() => setNewTrack(null)}>
                        Cancel
                      </button>
                    </span>
                  </div>
                ) : (
                  <AddButton label="Add Track" style={{ marginTop: 10 }} onClick={() => setNewTrack({ name: "" })} />
                ))}
            </section>
            </div>
          )}
      </div>
      {node}
    </>
  );
}
