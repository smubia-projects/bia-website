"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABEL, ROLES, type Role } from "@/app/lib/cms/taxonomy";
import { removePersonAction, savePersonAction } from "../../actions";
import { useActionToast } from "../../_components/ui";
import styles from "../../cms.module.css";

interface PersonView {
  email: string;
  name: string;
  role: Role;
  trackId: number | null;
  scope: string;
}

const ROLE_INFO: { role: Role; can: string; who: string }[] = [
  {
    role: "exco",
    can: "Everything: semester pages, all projects, approvals, track winners, the DAP newsletter and sessions, and people and roles.",
    who: "Exco members",
  },
  {
    role: "lodge_head",
    can: "Add and edit projects in their own track, then submit them for review. Can't publish or edit the semester page.",
    who: "Lodge heads, scoped to one track",
  },
  {
    role: "dap_editor",
    can: "Write and publish DAP newsletter issues, keep the co-learning schedule up to date, and edit DAP projects.",
    who: "DAP leads",
  },
];

export default function PeopleManager({
  people,
  tracks,
  me,
  bootstrap,
}: {
  people: PersonView[];
  tracks: { id: number; label: string }[];
  me: string;
  bootstrap: string[];
}) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const [form, setForm] = useState<{ email: string; name: string; role: Role; trackId: number | null }>({
    email: "",
    name: "",
    role: "lodge_head",
    trackId: tracks[0]?.id ?? null,
  });
  const [editing, setEditing] = useState<string | null>(null);

  async function save(input = form) {
    const ok = handle(await savePersonAction(input), `${input.email} saved`);
    if (ok !== undefined) {
      setEditing(null);
      setForm((f) => ({ ...f, email: "", name: "" }));
      router.refresh();
    }
  }

  async function remove(email: string) {
    if (!confirm(`Remove ${email}? They lose CMS access immediately.`)) return;
    if (handle(await removePersonAction(email)) !== undefined) router.refresh();
  }

  return (
    <>
      <h1 className={styles.h1}>People and roles</h1>
      <p className={styles.sub}>
        Sign-in is Google with SMU accounts only. Roles are set here, so nobody shares a password and access ends when someone is removed.
      </p>
      <div className={styles.roleCards}>
        {ROLE_INFO.map((r) => (
          <div key={r.role} className={styles.roleCard}>
            <span className={styles.roleName}>{ROLE_LABEL[r.role]}</span>
            <span style={{ fontSize: 13.5, lineHeight: 1.55 }}>{r.can}</span>
            <span className={styles.hint}>{r.who}</span>
          </div>
        ))}
      </div>

      <div className={styles.panel} style={{ marginTop: 20 }}>
        <h2 className={styles.h2}>Add a person</h2>
        <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <label className={styles.fld}>
            SMU email
            <input className={styles.inp} type="email" value={form.email} placeholder="name.2025@smu.edu.sg" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className={styles.fld}>
            Name
            <input className={styles.inp} value={form.name} placeholder="Optional" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className={styles.fld}>
            Role
            <select className={styles.inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          {form.role === "lodge_head" && (
            <label className={styles.fld}>
              Track
              <select className={styles.inp} value={form.trackId ?? ""} onChange={(e) => setForm({ ...form, trackId: e.target.value ? Number(e.target.value) : null })}>
                {tracks.length === 0 && <option value="">Create tracks on the semester page first</option>}
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button type="button" className={styles.btn} style={{ alignSelf: "flex-start" }} disabled={!form.email.trim()} onClick={() => save()}>
          Add person
        </button>
      </div>

      <div className={styles.tableWrap} style={{ marginTop: 20 }}>
        <table className={styles.table} style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Scope</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bootstrap.map((email) => (
              <tr key={`boot-${email}`}>
                <td>{email}</td>
                <td>{ROLE_LABEL.exco}</td>
                <td className={styles.hint}>Set by CMS_BOOTSTRAP_ADMINS</td>
                <td />
              </tr>
            ))}
            {people.map((p) =>
              editing === p.email ? (
                <EditRow key={p.email} person={p} tracks={tracks} onCancel={() => setEditing(null)} onSave={(input) => save(input)} />
              ) : (
                <tr key={p.email}>
                  <td>
                    <span className={styles.cellTitle}>{p.name || p.email}</span>
                    {p.name && <div className={styles.hint}>{p.email}</div>}
                  </td>
                  <td>{ROLE_LABEL[p.role]}</td>
                  <td>{p.scope}</td>
                  <td className={styles.actionsCell}>
                    <button type="button" className={styles.lnk} onClick={() => setEditing(p.email)}>
                      Edit
                    </button>
                    {p.email !== me && (
                      <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => remove(p.email)}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        {people.length === 0 && bootstrap.length === 0 && <p className={styles.emptyRow}>Nobody has been added yet.</p>}
      </div>
      {node}
    </>
  );
}

function EditRow({
  person,
  tracks,
  onCancel,
  onSave,
}: {
  person: PersonView;
  tracks: { id: number; label: string }[];
  onCancel: () => void;
  onSave: (input: { email: string; name: string; role: Role; trackId: number | null }) => void;
}) {
  const [f, setF] = useState<{ email: string; name: string; role: Role; trackId: number | null }>({
    email: person.email,
    name: person.name,
    role: person.role,
    trackId: person.trackId ?? tracks[0]?.id ?? null,
  });
  return (
    <tr>
      <td>
        <input className={`${styles.inp} ${styles.inpSmall}`} value={f.name} placeholder="Name" aria-label="Name" onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className={styles.hint}>{person.email}</div>
      </td>
      <td>
        <select className={`${styles.inp} ${styles.inpSmall}`} value={f.role} aria-label="Role" onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        {f.role === "lodge_head" ? (
          <select className={`${styles.inp} ${styles.inpSmall}`} value={f.trackId ?? ""} aria-label="Track" onChange={(e) => setF({ ...f, trackId: e.target.value ? Number(e.target.value) : null })}>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        ) : (
          "—"
        )}
      </td>
      <td className={styles.actionsCell}>
        <button type="button" className={styles.lnk} onClick={() => onSave(f)}>
          Save
        </button>
        <button type="button" className={styles.lnk} onClick={onCancel}>
          Cancel
        </button>
      </td>
    </tr>
  );
}
