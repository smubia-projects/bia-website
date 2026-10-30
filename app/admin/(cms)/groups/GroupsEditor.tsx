"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile } from "@/app/lib/db/schema";
import { deleteGroupAction, saveGroupAction } from "../../actions";
import { useActionToast, useImageUpload, useUnsavedChanges } from "../../_components/ui";
import styles from "../../cms.module.css";

interface GroupView {
  id: number;
  name: string;
  members: Profile[];
  mentors: Profile[];
}

const AVATAR_CROP = { ratio: 1, label: "1:1 · photo" };
const blank = (): Profile => ({ name: "", image: "", linkedin: "", email: "", telegram: "" });

/** DAP teaching groups for one cohort: each has members and 1–3 mentors. */
export default function GroupsEditor({
  cohortId,
  cohorts,
  groups,
  canEdit,
}: {
  cohortId: string;
  cohorts: { id: string; name: string }[];
  groups: GroupView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const uploader = useImageUpload("team");
  const [drafts, setDrafts] = useState<GroupView[]>(groups);
  const [busy, setBusy] = useState<number | "new" | null>(null);
  const [newName, setNewName] = useState("");
  const dirtyIds = drafts.filter((d) => JSON.stringify(d) !== JSON.stringify(groups.find((g) => g.id === d.id))).map((d) => d.id);
  useUnsavedChanges(busy === null && dirtyIds.length > 0);

  const patchGroup = (id: number, patch: Partial<GroupView>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  async function create() {
    setBusy("new");
    const id = handle(await saveGroupAction({ cohortId, name: newName || `Group ${groups.length + 1}` }), "Group added");
    setBusy(null);
    if (id !== undefined) {
      setNewName("");
      router.refresh();
    }
  }

  async function save(g: GroupView) {
    setBusy(g.id);
    const ok = handle(await saveGroupAction({ id: g.id, cohortId, name: g.name, members: g.members, mentors: g.mentors }), `${g.name} saved`);
    setBusy(null);
    if (ok !== undefined) router.refresh();
  }

  async function remove(g: GroupView) {
    if (!confirm(`Delete ${g.name}? Sessions it taught will show no group.`)) return;
    setBusy(g.id);
    const ok = handle(await deleteGroupAction(g.id), "Group deleted");
    setBusy(null);
    if (ok !== undefined) router.refresh();
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
            <div className={styles.row}>
              <button
                type="button"
                className={styles.ico}
                style={{ width: 42, height: 42, borderRadius: 999, overflow: "hidden", position: "relative" }}
                aria-label={p.image ? `Replace ${p.name || "this person"}'s photo` : "Add a photo"}
                disabled={!canEdit || uploader.busy}
                onClick={() => pickPhoto((url) => patch(i, { image: url }))}
              >
                {p.image ? <Image src={p.image} alt="" fill sizes="42px" style={{ objectFit: "cover" }} /> : "+"}
              </button>
              <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 180px", width: "auto" }} value={p.name} placeholder="Name" aria-label="Name" disabled={!canEdit} onChange={(e) => patch(i, { name: e.target.value })} />
              {p.image && canEdit && (
                <button type="button" className={styles.lnk} onClick={() => patch(i, { image: "" })}>
                  Remove photo
                </button>
              )}
              {canEdit && (
                <button type="button" className={styles.ico} aria-label={`Remove ${p.name || "this person"}`} onClick={() => setList(list.filter((_, j) => j !== i))}>
                  ×
                </button>
              )}
            </div>
            <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
              <input className={`${styles.inp} ${styles.inpSmall}`} value={p.linkedin ?? ""} placeholder="LinkedIn URL (optional)" aria-label="LinkedIn URL" disabled={!canEdit} onChange={(e) => patch(i, { linkedin: e.target.value })} />
              <input className={`${styles.inp} ${styles.inpSmall}`} type="email" value={p.email ?? ""} placeholder="Email (optional)" aria-label="Email" disabled={!canEdit} onChange={(e) => patch(i, { email: e.target.value })} />
              <input className={`${styles.inp} ${styles.inpSmall}`} value={p.telegram ?? ""} placeholder="Telegram @handle (optional)" aria-label="Telegram handle" disabled={!canEdit} onChange={(e) => patch(i, { telegram: e.target.value })} />
            </div>
          </div>
        ))}
        {canEdit && (
          <button type="button" className={styles.add} style={{ alignSelf: "flex-start" }} onClick={() => setList([...list, blank()])}>
            + {label === "Members" ? "Member" : "Mentor"}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Groups</h1>
          <p className={styles.sub}>
            Each group teaches co-learning sessions and has its own mentors. Groups show on the newsletter and on the DAP page. Pick which group teaches each week on{" "}
            <Link className={styles.lnk} style={{ padding: 0, minHeight: 0, fontSize: "inherit" }} href={`/admin/sessions?cohort=${cohortId}`}>
              Co-learning sessions
            </Link>
            .
          </p>
        </div>
      </div>

      {cohorts.length > 1 && (
        <div className={styles.row} style={{ marginTop: 18 }}>
          {cohorts.map((c) => (
            <Link key={c.id} href={`/admin/groups?cohort=${c.id}`} className={`${styles.pill} ${c.id === cohortId ? styles.pillOn : ""}`}>
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {drafts.length === 0 && (
        <p className={styles.hint} style={{ marginTop: 20, fontSize: 14 }}>
          No groups yet for this cohort.
        </p>
      )}

      {drafts.map((g) => (
        <section key={g.id} className={styles.panel} style={{ marginTop: 22, maxWidth: 880 }}>
          <div className={styles.between} style={{ flexWrap: "wrap" }}>
            <input
              className={styles.inp}
              style={{ maxWidth: 280, fontWeight: 700, fontSize: 16 }}
              value={g.name}
              aria-label="Group name"
              disabled={!canEdit}
              onChange={(e) => patchGroup(g.id, { name: e.target.value })}
            />
            {canEdit && (
              <span className={styles.row}>
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy === g.id} onClick={() => remove(g)}>
                  Delete group
                </button>
                <button type="button" className={styles.btn} disabled={busy === g.id || !dirtyIds.includes(g.id) || !g.name.trim()} onClick={() => save(g)}>
                  {busy === g.id ? "Saving…" : "Save group"}
                </button>
              </span>
            )}
          </div>
          {people(g, "members", "Members", "The associates in this group.")}
          {people(g, "mentors", "Mentors", "Usually one to three mentors guide each group.")}
        </section>
      ))}

      {canEdit && (
        <div className={styles.row} style={{ marginTop: 22 }}>
          <input
            className={`${styles.inp} ${styles.inpSmall}`}
            style={{ maxWidth: 240 }}
            value={newName}
            placeholder={`Group ${groups.length + 1}`}
            aria-label="New group name"
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="button" className={styles.add} disabled={busy === "new"} onClick={create}>
            + New group
          </button>
        </div>
      )}
      {uploader.cropper}
      {node}
    </>
  );
}
