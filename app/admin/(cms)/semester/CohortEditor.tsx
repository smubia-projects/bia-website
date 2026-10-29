"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Cohort, Track } from "@/app/lib/cms/cohorts";
import { trackAccent } from "@/app/components/cms/visuals";
import type { CohortVisibility, Programme } from "@/app/lib/cms/taxonomy";
import { createCohortAction, deleteTrackAction, saveCohortAction, saveTrackAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

interface Props {
  programme: Programme;
  cohorts: Cohort[];
  cohort: Cohort | null;
  tracks: Track[];
  canEdit: boolean;
  basePath: string;
  previewHref: string;
}

const VISIBILITY: { value: CohortVisibility; label: string }[] = [
  { value: "live", label: "Live: shown as current" },
  { value: "hidden", label: "Hidden" },
  { value: "archived", label: "Archived" },
];

export default function CohortEditor({ programme, cohorts, cohort, tracks, canEdit, basePath, previewHref }: Props) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const isLodge = programme === "AI Lodge";
  const noun = isLodge ? "semester" : "cohort";
  const [form, setForm] = useState({
    name: cohort?.name ?? "",
    visibility: cohort?.visibility ?? "hidden",
    headline: cohort?.headline ?? "",
    writeup: cohort?.writeup ?? "",
    hackDay: cohort?.hackDay ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(cohorts.length === 0);
  const [draft, setDraft] = useState({ slug: "", name: "" });
  const [editing, setEditing] = useState<Record<number, { name: string; heads: string }>>({});
  const [newTrack, setNewTrack] = useState<{ name: string; heads: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!cohort) return;
    setSaving(true);
    const ok = handle(await saveCohortAction(cohort.id, { ...form, visibility: form.visibility as CohortVisibility }));
    setSaving(false);
    if (ok !== undefined) router.refresh();
  }

  async function create() {
    const id = handle(await createCohortAction(programme, draft.slug, draft.name), `${draft.name} created`);
    if (id) {
      setCreating(false);
      router.push(`${basePath}?cohort=${id}`);
      router.refresh();
    }
  }

  async function saveTrack(input: { id?: number; name: string; heads: string }) {
    if (!cohort) return;
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

  async function removeTrack(t: Track) {
    if (!confirm(`Remove ${t.name}?`)) return;
    if (handle(await deleteTrackAction(t.id), "Track removed") !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>{isLodge ? "Semester page" : "Cohort page"}</h1>
          <p className={styles.sub}>
            {isLodge
              ? "The header, write-up and tracks shown at the top of Projects › AI Lodge."
              : "The cohort name and write-up shown on the DAP yearbook and newsletter."}
          </p>
        </div>
        {cohort && (
          <div className={styles.row}>
            <a className={styles.pill} href={previewHref} target="_blank" rel="noopener noreferrer">
              Preview
            </a>
            <button type="button" className={styles.btn} onClick={save} disabled={!canEdit || saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>

      <div className={styles.row} style={{ marginTop: 18 }}>
        {cohorts.map((c) => (
          <Link key={c.id} href={`${basePath}?cohort=${c.id}`} className={`${styles.pill} ${c.id === cohort?.id ? styles.pillOn : ""}`}>
            {c.name}
            {c.visibility === "live" ? <span className={styles.count}>live</span> : null}
          </Link>
        ))}
        {canEdit && !creating && (
          <button type="button" className={styles.add} onClick={() => setCreating(true)}>
            + New {noun}
          </button>
        )}
      </div>

      {creating && canEdit && (
        <div className={styles.panel} style={{ marginTop: 16, maxWidth: 640 }}>
          <h2 className={styles.h2}>New {noun}</h2>
          <div className={styles.grid2}>
            <label className={styles.fld}>
              Name
              <input className={styles.inp} value={draft.name} placeholder={isLodge ? "AY26/27 Semester 2" : "AY26/27 cohort"} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </label>
            <label className={styles.fld}>
              URL name
              <input className={styles.inp} value={draft.slug} placeholder={isLodge ? "ay2627-s2" : "ay2627"} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase() }))} />
              <span className={styles.hint}>
                Used in the address, e.g. {isLodge ? "/Projects/ai-lodge/" : "/DAP/projects/"}
                {draft.slug || (isLodge ? "ay2627-s2" : "ay2627")}
              </span>
            </label>
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={create} disabled={!draft.slug || !draft.name}>
              Create {noun}
            </button>
            {cohorts.length > 0 && (
              <button type="button" className={styles.pill} onClick={() => setCreating(false)}>
                Cancel
              </button>
            )}
          </div>
          {!isLodge && <span className={styles.hint}>New DAP cohorts start with a blank 10-week co-learning schedule.</span>}
        </div>
      )}

      {cohort && (
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
                placeholder={isLodge ? "What the tracks explored, Hack Day highlights, anything that stood out" : "The kinds of models teams built and Demo Day highlights"}
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
            <span className={styles.hint}>Setting a {noun} live archives the one that was live before.</span>
          </section>

          {isLodge && (
            <section className={`${styles.colSide} ${styles.panel}`} style={{ position: "static", gap: 0 }}>
              <h2 className={styles.h2}>Tracks</h2>
              <p className={styles.hint} style={{ margin: "4px 0 14px", fontSize: 13 }}>
                Each track becomes a shelf. The public page shuffles their order.
              </p>
              {tracks.map((t) => {
                const edit = editing[t.id];
                return (
                  <div key={t.id} className={styles.trackRow}>
                    <span className={styles.trackLetter} style={{ background: trackAccent(t.position) }}>
                      {t.letter || t.name.charAt(0)}
                    </span>
                    {edit ? (
                      <span className={styles.trackText} style={{ gap: 6 }}>
                        <input className={`${styles.inp} ${styles.inpSmall}`} value={edit.name} aria-label="Track name" onChange={(e) => setEditing((s) => ({ ...s, [t.id]: { ...edit, name: e.target.value } }))} />
                        <input className={`${styles.inp} ${styles.inpSmall}`} value={edit.heads} placeholder="Lodge heads" aria-label="Lodge heads" onChange={(e) => setEditing((s) => ({ ...s, [t.id]: { ...edit, heads: e.target.value } }))} />
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
                          {t.heads || "No lodge heads yet"} · {t.projectCount} {t.projectCount === 1 ? "project" : "projects"}
                        </span>
                      </span>
                    )}
                    {!edit && (
                      <>
                        {canEdit && (
                          <button type="button" className={styles.lnk} onClick={() => setEditing((s) => ({ ...s, [t.id]: { name: t.name, heads: t.heads } }))}>
                            Edit
                          </button>
                        )}
                        <Link className={styles.lnk} href={`/admin/projects?track=${t.id}`}>
                          Projects
                        </Link>
                      </>
                    )}
                  </div>
                );
              })}
              {canEdit &&
                (newTrack ? (
                  <div className={styles.subItem} style={{ marginTop: 10 }}>
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={newTrack.name} placeholder="Track name, e.g. Agents" aria-label="Track name" onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })} />
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={newTrack.heads} placeholder="Lodge heads" aria-label="Lodge heads" onChange={(e) => setNewTrack({ ...newTrack, heads: e.target.value })} />
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
                  <button type="button" className={styles.add} style={{ marginTop: 10 }} onClick={() => setNewTrack({ name: "", heads: "" })}>
                    + Track
                  </button>
                ))}
            </section>
          )}
        </div>
      )}
      {node}
    </>
  );
}
