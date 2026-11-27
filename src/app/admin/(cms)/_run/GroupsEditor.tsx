"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import type { Profile } from "@/app/lib/db/schema";
import { deleteGroupAction, saveGroupAction } from "../../actions";
import { AddButton, MiniField, Modal, OrderButtons, PageHead, UnsavedNote, moveItem, useActionToast, useConfirm, useImageUpload, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

interface GroupView {
  id: number;
  name: string;
  members: Profile[];
  mentors: Profile[];
}

const AVATAR_CROP = { ratio: 1, label: "1:1 · photo" };
const blank = (): Profile => ({ name: "", image: "", linkedin: "", email: "", telegram: "" });

/** DAP co-learning groups for one cohort: each has members and 1–3 mentors. */
export default function GroupsEditor({
  cohortId,
  cohortSlug,
  groups,
  canEdit,
}: {
  cohortId: string;
  cohortSlug: string;
  groups: GroupView[];
  canEdit: boolean;
}) {
  const { handle, node, show } = useActionToast();
  const confirm = useConfirm();
  const uploader = useImageUpload("team");
  const [drafts, setDrafts] = useState<GroupView[]>(groups);
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const dirtyIds = drafts.filter((d) => JSON.stringify(d) !== JSON.stringify(groups.find((g) => g.id === d.id))).map((d) => d.id);
  useUnsavedChanges(busy === null && dirtyIds.length > 0);

  const patchGroup = (id: number, patch: Partial<GroupView>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  async function create() {
    setBusy("new");
    const id = handle(await saveGroupAction({ cohortId, name: newName || `Group ${groups.length + 1}` }), "Group created");
    setBusy(null);
    if (id !== undefined) {
      setNewName("");
      setAdding(false);
    }
  }

  async function save(g: GroupView) {
    setBusy(g.id);
    handle(await saveGroupAction({ id: g.id, cohortId, name: g.name, members: g.members, mentors: g.mentors }), `${g.name} saved`);
    setBusy(null);
  }

  async function remove(g: GroupView) {
    if (!(await confirm({ title: "Delete Group", body: `${g.name} is deleted. Its sessions will show no group.`, action: "Delete Group", danger: true }))) return;
    setBusy(g.id);
    handle(await deleteGroupAction(g.id), "Group deleted");
    setBusy(null);
  }

  async function pickPhoto(update: (url: string) => void) {
    try {
      const url = await uploader.pick(AVATAR_CROP);
      if (url) update(url);
    } catch (e) {
      show(e instanceof Error ? e.message : "Upload failed", true);
    }
  }

  const people = (g: GroupView, key: "members" | "mentors", label: string, hint: string) => {
    const list = g[key];
    const setList = (next: Profile[]) => patchGroup(g.id, { [key]: next });
    const patch = (i: number, p: Partial<Profile>) => setList(list.map((x, j) => (j === i ? { ...x, ...p } : x)));
    return (
      <div className={styles.fld}>
        {label}
        <span className={styles.hint}>{hint}</span>
        {list.map((p, i) => (
          <div key={i} className={styles.subItem}>
            <div className={styles.rowEnd}>
              <button
                type="button"
                className={styles.avatarBtn}
                title={p.image ? "Replace Photo" : "Add Photo"}
                aria-label={p.image ? `Replace photo of ${p.name || "this person"}` : `Add photo of ${p.name || "this person"}`}
                disabled={!canEdit || uploader.busy}
                onClick={() => pickPhoto((url) => patch(i, { image: url }))}
              >
                {p.image ? <Image src={p.image} alt="" fill sizes="42px" style={{ objectFit: "cover" }} /> : <Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
              </button>
              <MiniField label="Name">
                <input className={`${styles.inp} ${styles.inpSmall}`} value={p.name} disabled={!canEdit} onChange={(e) => patch(i, { name: e.target.value })} />
              </MiniField>
              {p.image && canEdit && (
                <button type="button" className={styles.lnk} onClick={() => patch(i, { image: "" })}>
                  Remove Photo
                </button>
              )}
              {canEdit && <OrderButtons index={i} count={list.length} label={p.name || "this person"} onMove={(dir) => setList(moveItem(list, i, dir))} />}
              {canEdit && (
                <button type="button" className={styles.ico} aria-label={`Remove ${p.name || "this person"}`} title="Remove" onClick={() => setList(list.filter((_, j) => j !== i))}>
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
              <MiniField label="LinkedIn URL">
                <input className={`${styles.inp} ${styles.inpSmall}`} type="url" value={p.linkedin ?? ""} disabled={!canEdit} onChange={(e) => patch(i, { linkedin: e.target.value })} />
              </MiniField>
              <MiniField label="Email">
                <input className={`${styles.inp} ${styles.inpSmall}`} type="email" value={p.email ?? ""} disabled={!canEdit} onChange={(e) => patch(i, { email: e.target.value })} />
              </MiniField>
              <MiniField label="Telegram Handle">
                <input className={`${styles.inp} ${styles.inpSmall}`} value={p.telegram ?? ""} disabled={!canEdit} onChange={(e) => patch(i, { telegram: e.target.value })} />
              </MiniField>
            </div>
          </div>
        ))}
        {canEdit && <AddButton label={label === "Members" ? "Add Member" : "Add Mentor"} onClick={() => setList([...list, blank()])} />}
      </div>
    );
  };

  return (
    <>
      <PageHead
        title="Co-Learning Groups"
        sub={
          <>
            Groups teaching this cohort&apos;s sessions, assigned per week in the{" "}
            <Link className={`${styles.lnk} ${styles.lnkInline}`} href={runHref("DAP", cohortSlug, "schedule")}>
              Schedule
            </Link>
            . Project teams are set on each project.
          </>
        }
      >
        {canEdit && (
          <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
            Add Group
          </button>
        )}
      </PageHead>

      {drafts.length === 0 && (
        <p className={styles.emptyInline} style={{ marginTop: 20 }}>
          No groups in this cohort.
        </p>
      )}

      {drafts.map((g) => (
        <section key={g.id} className={styles.panel} style={{ marginTop: 22, maxWidth: 880 }}>
          <div className={styles.between} style={{ flexWrap: "wrap" }}>
            <label className={styles.fld} style={{ flex: "1 1 240px", maxWidth: 320 }}>
              Group Name
              <input className={styles.inp} value={g.name} disabled={!canEdit} onChange={(e) => patchGroup(g.id, { name: e.target.value })} />
            </label>
            {canEdit && (
              <span className={styles.row}>
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy === g.id} onClick={() => remove(g)}>
                  Delete Group
                </button>
                <UnsavedNote
                  show={dirtyIds.includes(g.id)}
                  onDiscard={() => {
                    const original = groups.find((x) => x.id === g.id);
                    if (original) patchGroup(g.id, original);
                  }}
                />
                <button type="button" className={styles.btn} disabled={busy === g.id || !dirtyIds.includes(g.id) || !g.name.trim()} onClick={() => save(g)}>
                  {busy === g.id ? "Saving…" : "Save Group"}
                </button>
              </span>
            )}
          </div>
          {people(g, "members", "Members", "Associates in this group.")}
          {people(g, "mentors", "Mentors", "One to three per group.")}
        </section>
      ))}

      {adding && (
        <Modal
          title="Add Group"
          onClose={() => setAdding(false)}
          onSubmit={create}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={busy === "new"}>
                {busy === "new" ? "Creating…" : "Create Group"}
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            Group Name
            <input className={styles.inp} autoFocus value={newName} placeholder={`Group ${groups.length + 1}`} onChange={(e) => setNewName(e.target.value)} />
          </label>
        </Modal>
      )}
      {uploader.cropper}
      {node}
    </>
  );
}
