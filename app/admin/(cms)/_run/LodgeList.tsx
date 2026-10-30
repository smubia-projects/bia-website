"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copyLodgeAction, deleteLodgeAction, moveLodgeAction, saveLodgeAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

export interface LodgeRowView {
  id: number;
  name: string;
  slug: string;
  status: "open" | "closed";
  captains: number;
  logo: string;
  accent: string;
  /** Its page on the AI Lodge site */
  href: string;
}

/**
 * One semester's lodges, in the order the AI Lodge site shows them. Lodges are per
 * semester: reuse one by copying it from another semester, then edit the copy.
 */
export default function LodgeList({
  cohortId,
  cohortSlug,
  archived,
  lodges,
  others,
  canEdit,
}: {
  cohortId: string;
  cohortSlug: string;
  /** A past semester: its lodges show on the AI Lodge site's "previous lodges" page */
  archived: boolean;
  lodges: LodgeRowView[];
  /** Lodges from other semesters that can be copied in */
  others: { semester: string; lodges: { id: number; name: string }[] }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const base = runHref("AI Lodge", cohortSlug, "lodges");

  async function create() {
    setBusy(true);
    const id = handle(await saveLodgeAction({ cohortId, name: newName }), `${newName} added`);
    setBusy(false);
    if (id) router.push(`${base}/${id}`);
  }

  async function copy(id: number) {
    setBusy(true);
    const newId = handle(await copyLodgeAction(id, cohortId), "Lodge copied into this semester");
    setBusy(false);
    if (newId) router.push(`${base}/${newId}`);
  }

  async function move(id: number, direction: "up" | "down") {
    if (handle(await moveLodgeAction(id, direction)) !== undefined) router.refresh();
  }

  async function remove(l: LodgeRowView) {
    if (!confirm(`Delete ${l.name}? Its projects keep everything except the lodge link.`)) return;
    if (handle(await deleteLodgeAction(l.id), "Lodge deleted") !== undefined) router.refresh();
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Lodges</h1>
          <p className={styles.sub}>
            {archived
              ? "This semester is past: the AI Lodge site lists these lodges under previous lodges, as they ran."
              : "Everything the AI Lodge site shows about each lodge: copy, captains, weekly trail, applications and art. This order is the order on the site."}
          </p>
        </div>
      </div>

      <section className={styles.panel} style={{ marginTop: 22, gap: 0 }}>
        {lodges.length === 0 && (
          <p className={styles.hint} style={{ margin: 0, fontSize: 14 }}>
            No lodges in this semester yet. Add one, or copy a lodge from another semester.
          </p>
        )}
        {lodges.map((l, index) => (
          <div key={l.id} className={styles.trackRow}>
            <span className={styles.lodgeLogo} style={{ background: l.logo ? undefined : l.accent }}>
              {l.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.logo} alt="" />
              ) : (
                l.name.charAt(0)
              )}
            </span>
            <span className={styles.trackText}>
              <Link href={`${base}/${l.id}`} className={styles.trackName}>
                {l.name}
              </Link>
              <span className={styles.hint}>
                {l.status === "closed" ? "Not taking applications" : "Taking applications"} · {l.captains} {l.captains === 1 ? "captain" : "captains"} ·{" "}
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.href.replace(/^https?:\/\//, "")}
                </a>
              </span>
            </span>
            {canEdit && (
              <>
                <span className={styles.trackOrder}>
                  <button type="button" className={styles.ico} aria-label={`Move ${l.name} up`} disabled={index === 0} onClick={() => move(l.id, "up")}>
                    ↑
                  </button>
                  <button type="button" className={styles.ico} aria-label={`Move ${l.name} down`} disabled={index === lodges.length - 1} onClick={() => move(l.id, "down")}>
                    ↓
                  </button>
                </span>
                <Link href={`${base}/${l.id}`} className={styles.lnk}>
                  Edit
                </Link>
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => remove(l)}>
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </section>

      {canEdit && (
        <div className={styles.cols} style={{ marginTop: 22 }}>
          <section className={`${styles.panel} ${styles.colMain}`}>
            <h2 className={styles.h2}>Add a lodge</h2>
            <div className={styles.row}>
              <input
                className={`${styles.inp} ${styles.inpSmall}`}
                style={{ maxWidth: 280 }}
                value={newName}
                placeholder="Lodge name, e.g. MIT Lodge"
                aria-label="New lodge name"
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="button" className={styles.btn} disabled={busy || !newName.trim()} onClick={create}>
                Add lodge
              </button>
            </div>
          </section>
          {others.length > 0 && (
            <section className={`${styles.panel} ${styles.colSide}`} style={{ position: "static" }}>
              <h2 className={styles.h2}>Copy from another semester</h2>
              <span className={styles.hint}>Brings the copy, captains, trail and art across. The original stays as it ran.</span>
              <select
                className={`${styles.inp} ${styles.inpSmall}`}
                value=""
                aria-label="Copy a lodge from another semester"
                disabled={busy}
                onChange={(e) => e.target.value && copy(Number(e.target.value))}
              >
                <option value="">Pick a lodge…</option>
                {others.map((o) => (
                  <optgroup key={o.semester} label={o.semester}>
                    {o.lodges.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </section>
          )}
        </div>
      )}
      {node}
    </>
  );
}
