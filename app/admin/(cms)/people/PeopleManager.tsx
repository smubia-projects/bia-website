"use client";

import { useState } from "react";
import { ROLE_LABEL, ROLE_PROGRAMME, ROLES, type Role } from "@/app/lib/cms/taxonomy";
import { removePersonAction, savePersonAction } from "../../actions";
import { Modal, PageHead, useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";

interface PersonView {
  email: string;
  name: string;
  role: Role;
  scope: string;
}

type PersonInput = { email: string; name: string; role: Role };

const ROLE_INFO: { role: Role; can: string }[] = [
  {
    role: "exco",
    can: "All content: AI Lodge, DAP, project approval, site links, photos, people and roles.",
  },
  {
    role: "dap_exco",
    can: "DAP only: cohorts, groups, schedule, newsletter and DAP projects. Publishing projects requires an exco admin.",
  },
  {
    role: "lodge_exco",
    can: "AI Lodge only: semesters, Hack Day tracks and winners, lodges, AI Lodge site photos, the applications switch and AI Lodge projects. Publishing projects requires an exco admin.",
  },
];

export default function PeopleManager({
  people,
  me,
  bootstrap,
}: {
  people: PersonView[];
  me: string;
  bootstrap: string[];
}) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<PersonInput>({ email: "", name: "", role: "dap_exco" });
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const emailOk = /^[^@\s]+@smu\.edu\.sg$/.test(form.email.trim().toLowerCase());

  async function save(input = form) {
    const ok = handle(await savePersonAction(input), `${input.email} saved`);
    if (ok !== undefined) {
      setEditing(null);
      setAdding(false);
      setForm((f) => ({ ...f, email: "", name: "" }));
    }
  }

  async function remove(email: string) {
    const yes = await confirm({ title: "Remove Person", body: `${email} loses CMS access immediately.`, action: "Remove Person", danger: true });
    if (yes) handle(await removePersonAction(email), `${email} removed`);
  }

  return (
    <>
      <PageHead title="People and Roles" sub="Google sign-in, @smu.edu.sg accounts only. Access ends when a person is removed.">
        <button type="button" className={styles.btn} onClick={() => setAdding(true)}>
          Add Person
        </button>
      </PageHead>

      <div className={styles.tableWrap} style={{ marginTop: 22 }}>
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
                <EditRow key={p.email} person={p} isMe={p.email === me} onCancel={() => setEditing(null)} onSave={(input) => save(input)} />
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
        {people.length === 0 && bootstrap.length === 0 && <p className={styles.emptyRow}>No people on the access list.</p>}
      </div>

      {adding && (
        <Modal
          title="Add Person"
          onClose={() => setAdding(false)}
          onSubmit={() => emailOk && save()}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={!emailOk}>
                Add Person
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            SMU Email
            <input className={styles.inp} type="email" autoFocus value={form.email} placeholder="name.2025@smu.edu.sg" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {form.email.trim() && !emailOk && <span className={styles.error}>Must be an @smu.edu.sg address.</span>}
          </label>
          <label className={styles.fld}>
            Name (Optional)
            <input className={styles.inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
        </Modal>
      )}

      <h2 className={styles.h2} style={{ marginTop: 28 }}>
        Role Permissions
      </h2>
      <div className={styles.roleCards} style={{ marginTop: 12 }}>
        {ROLE_INFO.map((r) => (
          <div key={r.role} className={styles.roleCard}>
            <span className={styles.roleName}>{ROLE_LABEL[r.role]}</span>
            <span style={{ fontSize: 14, lineHeight: 1.55 }}>{r.can}</span>
          </div>
        ))}
      </div>
      {node}
    </>
  );
}

function EditRow({
  person,
  isMe,
  onCancel,
  onSave,
}: {
  person: PersonView;
  /** People can't change their own role, so nobody locks themselves out. */
  isMe: boolean;
  onCancel: () => void;
  onSave: (input: PersonInput) => void;
}) {
  const [f, setF] = useState<PersonInput>({ email: person.email, name: person.name, role: person.role });
  return (
    <tr>
      <td>
        <input className={`${styles.inp} ${styles.inpSmall}`} value={f.name} placeholder="Name" aria-label="Name" onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className={styles.hint}>{person.email}</div>
      </td>
      <td>
        <select className={`${styles.inp} ${styles.inpSmall}`} value={f.role} aria-label="Role" disabled={isMe} title={isMe ? "The signed-in account cannot change its own role" : undefined} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td>{ROLE_PROGRAMME[f.role] ?? "All programmes"}</td>
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
