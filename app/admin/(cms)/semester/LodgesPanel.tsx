"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lodge } from "@/app/lib/cms/cohorts";
import { deleteLodgeAction, saveLodgeAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

type Draft = { name: string; url: string };

/**
 * A semester's lodges. Lodge pages and lodge head profiles live on the AI Lodge
 * site, so each lodge here is just a name and a link to its page there.
 */
export default function LodgesPanel({ cohortId, lodges, canEdit }: { cohortId: string; lodges: Lodge[]; canEdit: boolean }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [editing, setEditing] = useState<Record<number, Draft>>({});
  const [draft, setDraft] = useState<Draft | null>(null);

  async function save(input: Draft & { id?: number }) {
    const id = handle(await saveLodgeAction({ ...input, cohortId }), "Lodge saved");
    if (id === undefined) return;
    if (input.id) {
      setEditing((e) => {
        const next = { ...e };
        delete next[input.id!];
        return next;
      });
    } else {
      setDraft(null);
    }
    router.refresh();
  }

  async function remove(l: Lodge) {
    if (!confirm(`Remove ${l.name}? Its projects keep everything except the lodge link.`)) return;
    if (handle(await deleteLodgeAction(l.id), "Lodge removed") !== undefined) router.refresh();
  }

  const fields = (d: Draft, onChange: (d: Draft) => void) => (
    <>
      <input className={`${styles.inp} ${styles.inpSmall}`} value={d.name} placeholder="Lodge name" aria-label="Lodge name" onChange={(e) => onChange({ ...d, name: e.target.value })} />
      <input
        className={`${styles.inp} ${styles.inpSmall}`}
        type="url"
        value={d.url}
        placeholder="https://ailodge.smubia.com/…"
        aria-label="Lodge page on the AI Lodge site"
        onChange={(e) => onChange({ ...d, url: e.target.value })}
      />
    </>
  );

  return (
    <section className={styles.panel} style={{ gap: 0 }}>
      <h2 className={styles.h2}>Lodges</h2>
      <p className={styles.hint} style={{ margin: "4px 0 14px", fontSize: 13 }}>
        The lodges that ran this semester. Project pages link to the lodge&apos;s page on the AI Lodge site.
      </p>
      {lodges.length === 0 && !draft && (
        <p className={styles.hint} style={{ margin: "0 0 6px", fontSize: 13 }}>
          No lodges yet.
        </p>
      )}
      {lodges.map((l) => {
        const edit = editing[l.id];
        return (
          <div key={l.id} className={styles.trackRow}>
            {edit ? (
              <span className={styles.trackText} style={{ gap: 6 }}>
                {fields(edit, (d) => setEditing((s) => ({ ...s, [l.id]: d })))}
                <span className={styles.row}>
                  <button type="button" className={styles.lnk} disabled={!edit.name.trim()} onClick={() => save({ id: l.id, ...edit })}>
                    Save
                  </button>
                  <button
                    type="button"
                    className={styles.lnk}
                    onClick={() =>
                      setEditing((s) => {
                        const n = { ...s };
                        delete n[l.id];
                        return n;
                      })
                    }
                  >
                    Cancel
                  </button>
                  <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => remove(l)}>
                    Remove
                  </button>
                </span>
              </span>
            ) : (
              <>
                <span className={styles.trackText}>
                  <span className={styles.trackName}>{l.name}</span>
                  {l.url ? (
                    <a className={styles.hint} href={l.url} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>
                      {l.url.replace(/^https:\/\//, "")}
                    </a>
                  ) : (
                    <span className={styles.hint}>No lodge page link</span>
                  )}
                </span>
                {canEdit && (
                  <button type="button" className={styles.lnk} onClick={() => setEditing((s) => ({ ...s, [l.id]: { name: l.name, url: l.url } }))}>
                    Edit
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
      {canEdit &&
        (draft ? (
          <div className={styles.subItem} style={{ marginTop: 10 }}>
            {fields(draft, setDraft)}
            <span className={styles.row}>
              <button type="button" className={styles.btn} disabled={!draft.name.trim()} onClick={() => save(draft)}>
                Add lodge
              </button>
              <button type="button" className={styles.pill} onClick={() => setDraft(null)}>
                Cancel
              </button>
            </span>
          </div>
        ) : (
          <button type="button" className={styles.add} style={{ marginTop: 10 }} onClick={() => setDraft({ name: "", url: "" })}>
            + Lodge
          </button>
        ))}
      {node}
    </section>
  );
}
