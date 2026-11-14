"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MILESTONE_STATUSES, type BlockerStatus, type MilestoneStatus } from "@/app/lib/cms/taxonomy";
import {
  addBlockerAction,
  addSubtaskAction,
  deleteBlockerAction,
  deleteMemberAction,
  deleteMilestoneAction,
  deleteProjectGroupAction,
  deleteSubtaskAction,
  logMeetingAction,
  saveMemberAction,
  saveMilestoneAction,
  saveProjectGroupAction,
  setMeetingRemindersAction,
  setMilestoneStatusAction,
  unregisterChatAction,
  updateBlockerAction,
  updateSubtaskAction,
  type ActionResult,
} from "../../actions";
import { AddButton, Modal, PageHead, UnsavedNote, useActionToast, useConfirm, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";
import t from "../../tracker.module.css";

interface GroupView {
  id: number;
  number: number;
  name: string;
  mentors: string;
  chatId: number | null;
  remindersOn: boolean;
  lastMeeting: string;
  nextBy: string;
}
interface MilestoneView {
  id: number;
  title: string;
  notes: string;
  status: MilestoneStatus;
  startsOn: string | null;
  dueOn: string;
  dates: string;
  overdue: boolean;
  subtasks: { id: number; title: string; status: MilestoneStatus; dueOn: string | null; assigneeId: number | null }[];
  blockers: { id: number; description: string; status: BlockerStatus }[];
}
interface Props {
  cohortId: string;
  cohortSlug: string;
  today: string;
  group: GroupView;
  members: { id: number; name: string }[];
  milestones: MilestoneView[];
}

const STATUS_LABEL: Record<MilestoneStatus, string> = { todo: "To do", in_progress: "In progress", done: "Done" };
const blankMilestone = { title: "", notes: "", startsOn: "", dueOn: "", status: "todo" as MilestoneStatus };

/** A text field that saves when it loses focus, so a task or blocker can be corrected in place. */
function InlineText({ value, label, onCommit }: { value: string; label: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      className={`${styles.inp} ${styles.inpSmall} ${t.itemText}`}
      aria-label={label}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => (v.trim() && v.trim() !== value ? onCommit(v.trim()) : setV(value))}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

function AddRow({ placeholder, action, onAdd }: { placeholder: string; action: string; onAdd: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (text.trim() && (await onAdd(text.trim()))) setText("");
  };
  return (
    <div className={t.addRow}>
      <input className={`${styles.inp} ${styles.inpSmall}`} value={text} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())} />
      <button type="button" className={styles.pill} disabled={!text.trim()} onClick={submit}>
        {action}
      </button>
    </div>
  );
}

/** One project group: details, Telegram chat, meetings, roster and the milestones with their tasks and blockers. */
export default function GroupTracker({ cohortId, cohortSlug, today, group, members, milestones }: Props) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ number: group.number, name: group.name, mentors: group.mentors });
  const [meetingDate, setMeetingDate] = useState(today);
  const [editing, setEditing] = useState<(typeof blankMilestone & { id?: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = form.number !== group.number || form.name !== group.name || form.mentors !== group.mentors;
  useUnsavedChanges(dirty && !busy);
  const back = runHref("DAP", cohortSlug, "tracker");

  /** Runs an action, shows its error or message, and refreshes the page data on success. */
  async function call(res: Promise<ActionResult<unknown>>, ok?: string) {
    setBusy(true);
    const data = handle(await res, ok);
    setBusy(false);
    if (data !== undefined) router.refresh();
    return data !== undefined;
  }

  async function removeGroup() {
    if (!(await confirm({ title: "Delete Group", body: `Group ${group.number} is deleted with its milestones, tasks, blockers and roster.`, action: "Delete Group", danger: true }))) return;
    setBusy(true);
    const data = handle(await deleteProjectGroupAction(group.id), "Group deleted");
    setBusy(false);
    if (data !== undefined) router.push(back);
  }

  async function removeMilestone(m: MilestoneView) {
    if (await confirm({ title: "Delete Milestone", body: `"${m.title}" is deleted with its ${m.subtasks.length} tasks and ${m.blockers.length} blockers.`, action: "Delete Milestone", danger: true })) {
      await call(deleteMilestoneAction(m.id), "Milestone deleted");
    }
  }

  async function saveMilestone() {
    if (!editing) return;
    const ok = await call(
      saveMilestoneAction({ id: editing.id, groupId: group.id, title: editing.title, notes: editing.notes, startsOn: editing.startsOn || null, dueOn: editing.dueOn, status: editing.status }),
      editing.id ? "Milestone saved" : "Milestone added"
    );
    if (ok) setEditing(null);
  }

  return (
    <div className={styles.stack}>
      <PageHead title={`Group ${group.number}${group.name ? ` · ${group.name}` : ""}`} sub="Project group timeline. Members log tasks, blockers and meetings in Telegram." crumbs={[{ href: back, label: "Timeline Tracker" }]}>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={removeGroup}>
          Delete Group
        </button>
      </PageHead>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Group Details</h2>
        <div className={styles.grid2}>
          <label className={styles.fld}>
            Number
            <input className={styles.inp} type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} />
            <span className={styles.hint}>Used by bot commands, e.g. /register {form.number}.</span>
          </label>
          <label className={styles.fld}>
            Name
            <input className={styles.inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className={styles.fld}>
            Mentors
            <input className={styles.inp} value={form.mentors} placeholder="Names, comma-separated" onChange={(e) => setForm({ ...form, mentors: e.target.value })} />
            <span className={styles.hint}>Named in the meeting reminder.</span>
          </label>
        </div>
        <div className={styles.row}>
          <button type="button" className={styles.btn} disabled={busy || !dirty} onClick={() => call(saveProjectGroupAction({ id: group.id, cohortId, ...form }), "Group saved")}>
            Save Group
          </button>
          <UnsavedNote show={dirty} onDiscard={() => setForm({ number: group.number, name: group.name, mentors: group.mentors })} />
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Telegram and Meetings</h2>
        <div className={t.facts}>
          <div className={t.fact}>
            <span className={t.factTitle}>Telegram Chat</span>
            <span className={t.factValue}>{group.chatId ? "Registered" : "Not registered"}</span>
            <span className={styles.hint}>
              {group.chatId ? `Chat ID ${group.chatId}. Everyone in the chat has member access.` : `Send /register ${group.number} in the group's chat as DAP exco.`}
            </span>
            {group.chatId && (
              <button type="button" className={styles.pill} disabled={busy} onClick={async () => (await confirm({ title: "Unregister Chat", body: "The bot stops listening in this chat until it is registered again.", action: "Unregister Chat", danger: true })) && call(unregisterChatAction(group.id), "Chat unregistered")}>
                Unregister Chat
              </button>
            )}
          </div>
          <div className={t.fact}>
            <span className={t.factTitle}>Last Mentor Meeting</span>
            <span className={t.factValue}>{group.lastMeeting}</span>
            <span className={styles.hint}>Next meeting by {group.nextBy}.</span>
            <div className={styles.row}>
              <input className={`${styles.inp} ${styles.inpSmall}`} type="date" max={today} value={meetingDate} aria-label="Meeting date" onChange={(e) => setMeetingDate(e.target.value)} />
              <button type="button" className={styles.pill} disabled={busy || !meetingDate} onClick={() => call(logMeetingAction(group.id, meetingDate), "Meeting logged")}>
                Log Meeting
              </button>
            </div>
          </div>
          <div className={t.fact}>
            <span className={t.factTitle}>Meeting Reminders</span>
            <span className={t.factValue}>{group.remindersOn ? "On" : "Off"}</span>
            <span className={styles.hint}>Sent to the chat 3 weeks after the last meeting.</span>
            <button type="button" className={styles.pill} disabled={busy} onClick={() => call(setMeetingRemindersAction(group.id, !group.remindersOn))}>
              {group.remindersOn ? "Turn Off Reminders" : "Turn On Reminders"}
            </button>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>Roster</h2>
          <p className={styles.sectionHint}>Names offered as task assignees. Bot access comes from chat membership, not this list.</p>
        </div>
        <div>
          {members.map((m) => (
            <div key={m.id} className={t.item}>
              <InlineText value={m.name} label={`Name of ${m.name}`} onCommit={(name) => call(saveMemberAction({ id: m.id, groupId: group.id, name }))} />
              <button type="button" className={styles.ico} aria-label={`Remove ${m.name}`} title="Remove" disabled={busy} onClick={() => call(deleteMemberAction(m.id), "Member removed")}>
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ))}
          {members.length === 0 && <p className={t.none}>No members.</p>}
          <AddRow
            placeholder="Member name"
            action="Add Member"
            onAdd={(name) => call(saveMemberAction({ groupId: group.id, name }), "Member added")}
          />
        </div>
      </section>

      <section className={styles.stack} style={{ gap: 14 }}>
        <div className={styles.between}>
          <h2 className={styles.h2}>Milestones</h2>
          <AddButton label="Add Milestone" onClick={() => setEditing({ ...blankMilestone })} />
        </div>
        {milestones.length === 0 && <p className={styles.emptyInline}>No milestones.</p>}
        {milestones.map((m) => (
          <article key={m.id} className={t.milestone}>
            <div className={t.msHead}>
              <div className={t.lead}>
                <h3 className={t.msTitle}>
                  <span className={t.itemId}>#{m.id}</span> {m.title}
                </h3>
                <span className={t.msMeta}>
                  {m.dates} {m.overdue && <span className={`${t.chip} ${t.chipWarn}`}>Overdue</span>}
                </span>
              </div>
              <div className={styles.row}>
                <select className={`${styles.inp} ${styles.inpSmall}`} aria-label={`Status of ${m.title}`} value={m.status} disabled={busy} onChange={(e) => call(setMilestoneStatusAction(m.id, e.target.value as MilestoneStatus))}>
                  {MILESTONE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button type="button" className={styles.pill} onClick={() => setEditing({ id: m.id, title: m.title, notes: m.notes, startsOn: m.startsOn ?? "", dueOn: m.dueOn, status: m.status })}>
                  Edit Milestone
                </button>
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy} onClick={() => removeMilestone(m)}>
                  Delete
                </button>
              </div>
            </div>
            {m.notes && <p className={t.msNotes}>{m.notes}</p>}
            <div className={t.cols2}>
              <div>
                <div className={t.listHead}>Tasks · {m.subtasks.filter((s) => s.status === "done").length}/{m.subtasks.length} done</div>
                {m.subtasks.map((s) => (
                  <div key={`${s.id}-${s.title}`} className={t.task}>
                    <span className={t.itemId}>#{s.id}</span>
                    <select className={`${styles.inp} ${styles.inpSmall} ${t.ctl}`} aria-label={`Status of task ${s.id}`} value={s.status} disabled={busy} onChange={(e) => call(updateSubtaskAction(s.id, { status: e.target.value as MilestoneStatus }))}>
                      {MILESTONE_STATUSES.map((o) => (
                        <option key={o} value={o}>
                          {STATUS_LABEL[o]}
                        </option>
                      ))}
                    </select>
                    <InlineText value={s.title} label={`Title of task ${s.id}`} onCommit={(title) => call(updateSubtaskAction(s.id, { title }))} />
                    <button type="button" className={styles.ico} aria-label={`Delete task ${s.id}`} title="Delete" disabled={busy} onClick={() => call(deleteSubtaskAction(s.id), "Task deleted")}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <div className={t.taskMeta}>
                      <select className={`${styles.inp} ${styles.inpSmall} ${t.ctl}`} aria-label={`Assignee of task ${s.id}`} value={s.assigneeId ?? ""} disabled={busy} onChange={(e) => call(updateSubtaskAction(s.id, { assigneeId: e.target.value ? Number(e.target.value) : null }))}>
                        <option value="">Unassigned</option>
                        {members.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                      <input className={`${styles.inp} ${styles.inpSmall} ${t.ctl}`} type="date" aria-label={`Due date of task ${s.id}`} value={s.dueOn ?? ""} disabled={busy} onChange={(e) => call(updateSubtaskAction(s.id, { dueOn: e.target.value || null }))} />
                    </div>
                  </div>
                ))}
                {m.subtasks.length === 0 && <p className={t.none}>No tasks.</p>}
                <AddRow placeholder="Task title" action="Add Task" onAdd={(title) => call(addSubtaskAction({ milestoneId: m.id, title }))} />
              </div>
              <div>
                <div className={t.listHead}>Blockers · {m.blockers.filter((b) => b.status === "open").length} open</div>
                {m.blockers.map((b) => (
                  <div key={`${b.id}-${b.description}`} className={t.task}>
                    <span className={t.itemId}>#{b.id}</span>
                    <span className={`${t.chip} ${b.status === "open" ? t.chipWarn : t.chipOk}`}>{b.status === "open" ? "Open" : "Resolved"}</span>
                    <InlineText value={b.description} label={`Description of blocker ${b.id}`} onCommit={(description) => call(updateBlockerAction(b.id, { description }))} />
                    <button type="button" className={styles.ico} aria-label={`Delete blocker ${b.id}`} title="Delete" disabled={busy} onClick={() => call(deleteBlockerAction(b.id), "Blocker deleted")}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <div className={t.taskMeta}>
                      <button type="button" className={styles.pill} disabled={busy} onClick={() => call(updateBlockerAction(b.id, { status: b.status === "open" ? "resolved" : "open" }))}>
                        {b.status === "open" ? "Resolve Blocker" : "Reopen Blocker"}
                      </button>
                    </div>
                  </div>
                ))}
                {m.blockers.length === 0 && <p className={t.none}>No blockers.</p>}
                <AddRow placeholder="What is blocking the group" action="Add Blocker" onAdd={(description) => call(addBlockerAction({ milestoneId: m.id, description }))} />
              </div>
            </div>
          </article>
        ))}
      </section>

      {editing && (
        <Modal
          title={editing.id ? "Edit Milestone" : "Add Milestone"}
          onClose={() => setEditing(null)}
          onSubmit={() => !busy && saveMilestone()}
          footer={
            <>
              <button type="button" className={styles.pill} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className={styles.btn} disabled={busy || !editing.title.trim() || !editing.dueOn}>
                {busy ? "Saving…" : "Save Milestone"}
              </button>
            </>
          }
        >
          <label className={styles.fld}>
            Title
            <input className={styles.inp} autoFocus required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </label>
          <div className={styles.grid2}>
            <label className={styles.fld}>
              Start Date
              <input className={styles.inp} type="date" value={editing.startsOn} onChange={(e) => setEditing({ ...editing, startsOn: e.target.value })} />
              <span className={styles.hint}>Optional. Without it the timeline shows a marker.</span>
            </label>
            <label className={styles.fld}>
              Due Date
              <input className={styles.inp} type="date" required value={editing.dueOn} onChange={(e) => setEditing({ ...editing, dueOn: e.target.value })} />
            </label>
          </div>
          <label className={styles.fld}>
            Notes
            <textarea className={styles.inp} rows={3} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          </label>
        </Modal>
      )}
      {node}
    </div>
  );
}
