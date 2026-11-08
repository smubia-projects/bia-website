"use client";

import { useState } from "react";
import { LODGE_HEAD_ACCESS_WEEKS, ROLE_LABEL, ROLE_PROGRAMME, ROLES, SUPERADMIN_LABEL, suggestedAccessEnd, type Role } from "@/app/lib/cms/taxonomy";
import { removePersonAction, savePersonAction } from "../../actions";
import { Modal, PageHead, useActionToast, useConfirm } from "../../_components/ui";
import styles from "../../cms.module.css";

interface PersonView {
  email: string;
  name: string;
  role: Role;
  lodgeIds: number[];
  accessEnds: string | null;
  expired: boolean;
}

interface LodgeView {
  id: number;
  name: string;
  cohortId: string;
  cohortName: string;
  startsOn: string | null;
}

interface Form {
  email: string;
  name: string;
  role: Role;
  lodgeIds: number[];
  /** Whether access has an end date */
  ends: boolean;
  accessEnds: string;
  /** The date was edited by hand, so picking lodges no longer replaces it */
  dateTouched: boolean;
}

const ROLE_INFO: { label: string; can: string }[] = [
  {
    label: SUPERADMIN_LABEL,
    can: "Everything an exco admin can do, plus people, roles and anyone's access tokens. Set by CMS_BOOTSTRAP_ADMINS in the deployment.",
  },
  {
    label: ROLE_LABEL.exco,
    can: "All content: AI Lodge, DAP, project approval, site links and photos.",
  },
  {
    label: ROLE_LABEL.dap_exco,
    can: "DAP only: cohorts, groups, schedule, newsletter and DAP projects. Publishing projects requires an exco admin.",
  },
  {
    label: ROLE_LABEL.lodge_exco,
    can: "AI Lodge only: semesters, Hack Day tracks and winners, lodges, AI Lodge site photos, the applications switch and AI Lodge projects. Returns submitted projects to draft; publishing requires an exco admin.",
  },
  {
    label: ROLE_LABEL.lodge_head,
    can: `Their own lodges' projects only: add and edit drafts, then submit for review. Submitted and published projects are locked for them. Access ends ${LODGE_HEAD_ACCESS_WEEKS} weeks after the semester's week 1 by default.`,
  },
];

const BLANK: Form = { email: "", name: "", role: "lodge_head", lodgeIds: [], ends: true, accessEnds: "", dateTouched: false };

function formatDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function PeopleManager({
  people,
  me,
  superadmins,
  lodges,
}: {
  people: PersonView[];
  me: string;
  superadmins: string[];
  lodges: LodgeView[];
}) {
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState(false);
  const lodgeName = (id: number) => {
    const l = lodges.find((x) => x.id === id);
    return l ? `${l.name} (${l.cohortName})` : "Removed lodge";
  };

  const suggestion = (ids: number[]) => suggestedAccessEnd(lodges.filter((l) => ids.includes(l.id)).map((l) => l.startsOn));

  function open(p?: PersonView) {
    setEditing(Boolean(p));
    setForm(
      p
        ? {
            email: p.email,
            name: p.name,
            role: p.role,
            lodgeIds: p.lodgeIds,
            ends: p.role !== "lodge_head" || Boolean(p.accessEnds),
            accessEnds: p.accessEnds ?? suggestion(p.lodgeIds) ?? "",
            dateTouched: true,
          }
        : BLANK
    );
  }

  function toggleLodge(id: number) {
    setForm((f) => {
      if (!f) return f;
      const lodgeIds = f.lodgeIds.includes(id) ? f.lodgeIds.filter((x) => x !== id) : [...f.lodgeIds, id];
      return { ...f, lodgeIds, accessEnds: f.dateTouched ? f.accessEnds : suggestion(lodgeIds) ?? "" };
    });
  }

  async function save() {
    if (!form) return;
    const head = form.role === "lodge_head";
    const ok = handle(
      await savePersonAction({
        email: form.email,
        name: form.name,
        role: form.role,
        ...(head ? { lodgeIds: form.lodgeIds, accessEnds: form.ends && form.accessEnds ? form.accessEnds : null } : {}),
      }),
      `${form.email.trim().toLowerCase()} saved`
    );
    if (ok !== undefined) setForm(null);
  }

  async function remove(email: string) {
    const yes = await confirm({ title: "Remove Person", body: `${email} loses CMS access immediately.`, action: "Remove Person", danger: true });
    if (yes) handle(await removePersonAction(email), `${email} removed`);
  }

  const emailOk = form ? /^[^@\s]+@smu\.edu\.sg$/.test(form.email.trim().toLowerCase()) : false;
  const isHead = form?.role === "lodge_head";
  const canSubmit = Boolean(form) && emailOk && (!isHead || (form!.lodgeIds.length > 0 && (!form!.ends || Boolean(form!.accessEnds))));
  const suggested = form && isHead ? suggestion(form.lodgeIds) : null;
  const semesters = [...new Map(lodges.map((l) => [l.cohortId, l.cohortName])).entries()].reverse();

  const scope = (p: PersonView) =>
    p.role === "lodge_head" ? (p.lodgeIds.length ? p.lodgeIds.map(lodgeName).join(", ") : <span className={styles.hint}>No lodges</span>) : ROLE_PROGRAMME[p.role] ?? "All programmes";

  return (
    <>
      <PageHead title="People and Roles" sub="Google sign-in, @smu.edu.sg accounts only. Access ends when a person is removed or their end date passes.">
        <button type="button" className={styles.btn} onClick={() => open()}>
          Add Person
        </button>
      </PageHead>

      <div className={styles.tableWrap} style={{ marginTop: 22 }}>
        <table className={styles.table} style={{ minWidth: 680 }}>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Scope</th>
              <th>Access Ends</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {superadmins.map((email) => (
              <tr key={`super-${email}`}>
                <td>{email}</td>
                <td>{SUPERADMIN_LABEL}</td>
                <td>All programmes</td>
                <td className={styles.hint}>Set by CMS_BOOTSTRAP_ADMINS</td>
                <td />
              </tr>
            ))}
            {people.map((p) => (
              <tr key={p.email}>
                <td>
                  <span className={styles.cellTitle}>{p.name || p.email}</span>
                  {p.name && <div className={styles.hint}>{p.email}</div>}
                </td>
                <td>{ROLE_LABEL[p.role]}</td>
                <td>{scope(p)}</td>
                <td>
                  {p.accessEnds ? (
                    <>
                      {formatDate(p.accessEnds)}
                      {p.expired && (
                        <span className={styles.status} style={{ marginLeft: 6, background: "var(--surface-muted)", color: "var(--danger)" }}>
                          Expired
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={styles.hint}>No end</span>
                  )}
                </td>
                <td className={styles.actionsCell}>
                  <button type="button" className={styles.lnk} onClick={() => open(p)}>
                    Edit
                  </button>
                  {p.email !== me && (
                    <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => remove(p.email)}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {people.length === 0 && superadmins.length === 0 && <p className={styles.emptyRow}>No people on the access list.</p>}
      </div>

      {form && (
        <Modal
          title={editing ? "Edit Person" : "Add Person"}
          onClose={() => setForm(null)}
          onSubmit={() => canSubmit && save()}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setForm(null)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={!canSubmit}>
                {editing ? "Save Changes" : "Add Person"}
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            SMU Email
            <input
              className={styles.inp}
              type="email"
              autoFocus={!editing}
              disabled={editing}
              value={form.email}
              placeholder="name.2025@smu.edu.sg"
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {form.email.trim() && !emailOk && <span className={styles.error}>Must be an @smu.edu.sg address.</span>}
          </label>
          <label className={styles.fld}>
            Name (Optional)
            <input className={styles.inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className={styles.fld}>
            Role
            <select
              className={styles.inp}
              value={form.role}
              disabled={editing && form.email === me}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>

          {isHead && (
            <fieldset className={styles.fieldset} style={{ gap: 6 }}>
              <legend className={styles.legend}>Lodges</legend>
              {lodges.length === 0 && <span className={styles.hint}>No lodges yet. Add them on a semester&apos;s Lodges page.</span>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto" }}>
                {semesters.map(([cohortId, cohortName]) => (
                  <div key={cohortId} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span className={styles.monoLabel}>{cohortName}</span>
                    {lodges
                      .filter((l) => l.cohortId === cohortId)
                      .map((l) => (
                        <label key={l.id} className={styles.radio}>
                          <input type="checkbox" checked={form.lodgeIds.includes(l.id)} onChange={() => toggleLodge(l.id)} />
                          {l.name}
                        </label>
                      ))}
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {isHead && (
            <fieldset className={styles.fieldset} style={{ gap: 6 }}>
              <legend className={styles.legend}>Access Ends</legend>
              <label className={styles.radio}>
                <input type="checkbox" checked={form.ends} onChange={(e) => setForm({ ...form, ends: e.target.checked })} />
                End access on a date
              </label>
              {form.ends && (
                <input
                  className={styles.inp}
                  type="date"
                  aria-label="Last day of access"
                  value={form.accessEnds}
                  onChange={(e) => setForm({ ...form, accessEnds: e.target.value, dateTouched: true })}
                />
              )}
              <span className={styles.hint}>
                {suggested
                  ? `Suggested: ${formatDate(suggested)}, ${LODGE_HEAD_ACCESS_WEEKS} weeks from the semester's week 1.`
                  : form.lodgeIds.length
                    ? "No suggestion: set the semester's Week 1 Start Date on its Overview."
                    : `Pick a lodge to suggest a date ${LODGE_HEAD_ACCESS_WEEKS} weeks from its semester's week 1.`}
                {suggested && form.ends && form.accessEnds !== suggested && (
                  <>
                    {" "}
                    <button type="button" className={`${styles.lnk} ${styles.lnkInline}`} onClick={() => setForm({ ...form, accessEnds: suggested, dateTouched: false })}>
                      Use Suggested Date
                    </button>
                  </>
                )}
              </span>
            </fieldset>
          )}
        </Modal>
      )}

      <h2 className={styles.h2} style={{ marginTop: 28 }}>
        Role Permissions
      </h2>
      <div className={styles.roleCards} style={{ marginTop: 12 }}>
        {ROLE_INFO.map((r) => (
          <div key={r.label} className={styles.roleCard}>
            <span className={styles.roleName}>{r.label}</span>
            <span style={{ fontSize: 14, lineHeight: 1.55 }}>{r.can}</span>
          </div>
        ))}
      </div>
      {node}
    </>
  );
}
