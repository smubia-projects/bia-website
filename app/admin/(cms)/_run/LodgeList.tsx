"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { copyLodgeAction, deleteLodgeAction, moveLodgeAction, saveLodgeAction, setApplicationsOpenAction } from "../../actions";
import { Modal, OrderButtons, PageHead, PickerDialog, useActionToast, useConfirm } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

export interface LodgeRowView {
  id: number;
  name: string;
  slug: string;
  status: "open" | "closed";
  placeholder: boolean;
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
  applications,
}: {
  cohortId: string;
  cohortSlug: string;
  /** A past semester: its lodges show on the AI Lodge site's "previous lodges" page */
  archived: boolean;
  lodges: LodgeRowView[];
  /** Lodges from other semesters that can be copied in */
  others: { semester: string; lodges: { id: number; name: string }[] }[];
  canEdit: boolean;
  /** The AI Lodge applications switch; shown on the current semester only */
  applications: { open: boolean; canSwitch: boolean } | null;
}) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copying, setCopying] = useState(false);
  const [newName, setNewName] = useState("");
  const base = runHref("AI Lodge", cohortSlug, "lodges");

  async function create() {
    setBusy(true);
    const id = handle(await saveLodgeAction({ cohortId, name: newName }), `${newName} created`);
    setBusy(false);
    if (id) router.push(`${base}/${id}`);
  }

  async function copy(ids: string[]) {
    setBusy(true);
    let done = 0;
    for (const id of ids) {
      const res = await copyLodgeAction(Number(id), cohortId);
      if (!res.ok) {
        show(`${done} of ${ids.length} copied. ${res.error}`, true);
        setBusy(false);
        return;
      }
      done++;
    }
    show(`${done} ${done === 1 ? "lodge" : "lodges"} copied`);
    setBusy(false);
    setCopying(false);
  }

  async function move(index: number, dir: -1 | 1) {
    setBusy(true);
    handle(await moveLodgeAction(lodges[index].id, dir === -1 ? "up" : "down"));
    setBusy(false);
  }

  async function switchApplications(open: boolean) {
    const yes = await confirm({
      title: open ? "Open AI Lodge Applications" : "Close AI Lodge Applications",
      body: open ? "Apply buttons on smubia.com and the AI Lodge site link to the sign-up form immediately." : "All lodges show as closed immediately, and apply buttons link to the club Telegram.",
      action: open ? "Open Applications" : "Close Applications",
      danger: !open,
    });
    if (!yes) return;
    setBusy(true);
    handle(await setApplicationsOpenAction("AI Lodge", open));
    setBusy(false);
  }

  async function remove(l: LodgeRowView) {
    if (!(await confirm({ title: "Delete Lodge", body: `${l.name} is deleted. Its projects stay, without a lodge.`, action: "Delete Lodge", danger: true }))) return;
    handle(await deleteLodgeAction(l.id), "Lodge deleted");
  }

  return (
    <>
      <PageHead title="Lodges" sub={archived ? "Past semester. Listed under previous lodges on the AI Lodge site." : "Lodge content for the AI Lodge site, in display order."}>
        {canEdit && others.length > 0 && (
          <button type="button" className={styles.pill} onClick={() => setCopying(true)}>
            Copy From Another Semester
          </button>
        )}
        {canEdit && (
          <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
            Add Lodge
          </button>
        )}
      </PageHead>

      {applications && (
        <section className={styles.panel} style={{ marginTop: 22 }}>
          <div className={styles.between} style={{ flexWrap: "wrap", gap: 12 }}>
            <span>
              <strong>Applications: {applications.open ? "Open" : "Closed"}</strong>
              <span className={styles.hint} style={{ display: "block" }}>
                {applications.open ? "Apply buttons link to the sign-up form. Lodges marked closed stay closed." : "All lodges show as closed. Apply buttons link to the club Telegram."}
              </span>
            </span>
            {applications.canSwitch && (
              <button type="button" className={applications.open ? styles.pill : styles.btn} disabled={busy} onClick={() => switchApplications(!applications.open)}>
                {applications.open ? "Close Applications" : "Open Applications"}
              </button>
            )}
          </div>
        </section>
      )}

      <section className={styles.panel} style={{ marginTop: 22, gap: 0 }}>
        {lodges.length === 0 && <p className={styles.emptyInline}>No lodges in this semester.</p>}
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
                {l.placeholder ? "Details not released · " : ""}
                {l.status === "closed" ? "Applications closed" : "Applications open"} · {l.captains} {l.captains === 1 ? "captain" : "captains"} ·{" "}
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.href.replace(/^https?:\/\//, "")}
                </a>
              </span>
            </span>
            {canEdit && (
              <>
                <OrderButtons index={index} count={lodges.length} label={l.name} disabled={busy} onMove={(dir) => move(index, dir)} />
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

      {adding && (
        <Modal
          title="Add Lodge"
          onClose={() => setAdding(false)}
          onSubmit={() => newName.trim() && create()}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={busy || !newName.trim()}>
                {busy ? "Creating…" : "Create Lodge"}
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            Lodge Name
            <input className={styles.inp} autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
        </Modal>
      )}

      {copying && (
        <PickerDialog
          title="Copy Lodges"
          sub="Copies all lodge content into this semester. The originals are unchanged."
          groups={others.map((o) => ({ label: o.semester, items: o.lodges.map((l) => ({ id: String(l.id), title: l.name })) }))}
          busy={busy}
          actionLabel={(n) => (n ? `Copy ${n} ${n === 1 ? "Lodge" : "Lodges"}` : "Copy Lodges")}
          onConfirm={copy}
          onClose={() => setCopying(false)}
        />
      )}
      {node}
    </>
  );
}
