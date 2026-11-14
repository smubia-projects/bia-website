"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProjectGroupAction } from "../../actions";
import { Modal, useActionToast } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

/** Creates a project group, then opens its page. */
export default function AddGroupButton({ cohortId, cohortSlug, nextNumber }: { cohortId: string; cohortSlug: string; nextNumber: number }) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(nextNumber);
  const [name, setName] = useState("");
  const [mentors, setMentors] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const id = handle(await saveProjectGroupAction({ cohortId, number, name, mentors }), "Group created");
    setBusy(false);
    if (id !== undefined) router.push(runHref("DAP", cohortSlug, `tracker/${id}`));
  }

  return (
    <>
      <button type="button" className={styles.btn} onClick={() => { setNumber(nextNumber); setOpen(true); }}>
        Add Group
      </button>
      {open && (
        <Modal
          title="Add Group"
          onClose={() => setOpen(false)}
          onSubmit={() => !busy && create()}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={busy}>
                {busy ? "Creating…" : "Create Group"}
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            Number
            <input className={styles.inp} type="number" min={1} required value={number} onChange={(e) => setNumber(Number(e.target.value))} />
            <span className={styles.hint}>Used by the bot, e.g. /register {number}.</span>
          </label>
          <label className={styles.fld}>
            Name
            <input className={styles.inp} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className={styles.fld}>
            Mentors
            <input className={styles.inp} value={mentors} placeholder="Names, comma-separated" onChange={(e) => setMentors(e.target.value)} />
            <span className={styles.hint}>Named in the meeting reminder.</span>
          </label>
        </Modal>
      )}
      {node}
    </>
  );
}
