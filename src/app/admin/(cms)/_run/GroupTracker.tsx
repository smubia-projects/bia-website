"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import { MILESTONE_STATUSES, type BlockerStatus, type MilestoneStatus } from "@/shared/taxonomy";
import {
  addBlockerAction,
  addSubtaskAction,
  createChatLinkAction,
  deleteBlockerAction,
  deleteMemberAction,
  deleteMilestoneAction,
  deleteProjectGroupAction,
  deleteSubtaskAction,
  disconnectChatAction,
  logMeetingAction,
  saveMemberAction,
  saveMilestoneAction,
  saveProjectGroupAction,
  setMeetingRemindersAction,
  setMilestoneStatusAction,
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
  /** M1, M2, … within the project group, as the bot shows it */
  number: number;
  title: string;
  notes: string;
  status: MilestoneStatus;
  startsOn: string | null;
  dueOn: string;
  dates: string;
  overdue: boolean;
  subtasks: { id: number; number: number; title: string; status: MilestoneStatus; dueOn: string | null; assigneeId: number | null; assigneeName: string }[];
  blockers: { id: number; number: number; description: string; status: BlockerStatus }[];
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

const OTHER = "other";

/**
 * A task's assignee: someone on the member list, or a name typed in for someone who isn't
 * (shown as "Not on the list"). Picking "Someone Else" opens the name field.
 */
function AssigneePicker({ task, members, disabled, onChange }: {
  task: { id: number; assigneeId: number | null; assigneeName: string };
  members: { id: number; name: string }[];
  disabled: boolean;
  onChange: (patch: { assigneeId?: number | null; assigneeName?: string }) => void;
}) {
  const [typing, setTyping] = useState(Boolean(task.assigneeName));
  const value = task.assigneeId ?? (typing ? OTHER : "");
  return (
    <>
      <select
        className={`${styles.inp} ${styles.inpSmall} ${t.ctl}`}
        aria-label={`Assignee of task ${task.id}`}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === OTHER) return setTyping(true);
          setTyping(false);
          onChange({ assigneeId: e.target.value ? Number(e.target.value) : null });
        }}
      >
        <option value="">Unassigned</option>
        {members.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
        <option value={OTHER}>Someone Else</option>
      </select>
      {typing && (
        <input
          className={`${styles.inp} ${styles.inpSmall} ${t.ctl}`}
          aria-label={`Assignee name for task ${task.id}`}
          placeholder="Name (not on the list)"
          defaultValue={task.assigneeName}
          disabled={disabled}
          autoFocus={!task.assigneeName}
          onBlur={(e) => e.target.value.trim() !== task.assigneeName && onChange({ assigneeName: e.target.value.trim() })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      )}
    </>
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

/** A status as a coloured dot and a word: semantic colour, never a pill. */
function State({ tone, children }: { tone: "ok" | "warn" | "muted" | "neutral"; children: React.ReactNode }) {
  const cls = { ok: t.stateOk, warn: t.stateWarn, muted: t.stateMuted, neutral: "" }[tone];
  return <span className={`${t.state} ${cls}`}>{children}</span>;
}

/**
 * One project group: its milestones with their tasks and blockers first (what the page is for),
 * then the Telegram chat and meetings, the members, and last the rarely edited details.
 */
export default function GroupTracker({ cohortId, cohortSlug, today, group, members, milestones }: Props) {
  const router = useRouter();
  const { handle, node } = useActionToast();
  const confirm = useConfirm();
  const [form, setForm] = useState({ number: group.number, name: group.name, mentors: group.mentors });
  const [meetingDate, setMeetingDate] = useState(today);
  const [editing, setEditing] = useState<(typeof blankMilestone & { id?: number }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatLink, setChatLink] = useState<string | null>(null);
  const dirty = form.number !== group.number || form.name !== group.name || form.mentors !== group.mentors;
  useUnsavedChanges(dirty && !busy);
  const back = runHref("DAP", cohortSlug, "project-groups");

  /** Runs an action, shows its error or message, and refreshes the page data on success. */
  async function call(res: Promise<ActionResult<unknown>>, ok?: string) {
    setBusy(true);
    const data = handle(await res, ok);
    setBusy(false);
    if (data !== undefined) router.refresh();
    return data !== undefined;
  }

  async function removeGroup() {
    if (!(await confirm({ title: "Delete Project Group", body: `Group ${group.number} is deleted with its milestones, tasks, blockers and members.`, action: "Delete Project Group", danger: true }))) return;
    setBusy(true);
    const data = handle(await deleteProjectGroupAction(group.id), "Project group deleted");
    setBusy(false);
    if (data !== undefined) router.push(back);
  }

  async function connectChat() {
    setBusy(true);
    const url = handle(await createChatLinkAction(group.id));
    setBusy(false);
    if (url) setChatLink(url);
  }

  async function removeMilestone(m: { id: number; title: string; tasks: number; blockers: number }) {
    if (await confirm({ title: "Delete Milestone", body: `"${m.title}" is deleted with its ${m.tasks} tasks and ${m.blockers} blockers.`, action: "Delete Milestone", danger: true })) {
      if (await call(deleteMilestoneAction(m.id), "Milestone deleted")) setEditing(null);
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

  const editingMilestone = editing?.id ? milestones.find((m) => m.id === editing.id) : undefined;

  return (
    <div className={styles.stack}>
      <PageHead title={`Group ${group.number}`} sub={group.name || undefined} crumbs={[{ href: back, label: "Project Groups" }]} />

      <section className={styles.stack} aria-labelledby="milestones-title">
        <div className={styles.between}>
          <h2 id="milestones-title" className={styles.h2}>
            Milestones
          </h2>
          <AddButton label="Add Milestone" onClick={() => setEditing({ ...blankMilestone })} />
        </div>
        {milestones.length === 0 && <p className={`${styles.panel} ${styles.emptyInline}`}>No milestones.</p>}
        {milestones.map((m) => {
          const done = m.subtasks.filter((s) => s.status === "done").length;
          const open = m.blockers.filter((b) => b.status === "open").length;
          return (
            <article key={m.id} className={t.milestone}>
              <div className={t.msTop}>
                <div className={t.msHead}>
                  <div className={t.lead}>
                    <h3 className={t.msTitle}>
                      <span className={t.msNumber}>M{m.number}</span> {m.title}
                    </h3>
                    <span className={t.msMeta}>
                      {m.dates}
                      {m.overdue && <span className={t.overdueText}>, overdue</span>}
                    </span>
                  </div>
                  <div className={styles.row}>
                    <select className={`${styles.inp} ${styles.inpSmall} ${t.msStatus}`} aria-label={`Status of milestone M${m.number}`} value={m.status} disabled={busy} onChange={(e) => call(setMilestoneStatusAction(m.id, e.target.value as MilestoneStatus))}>
                      {MILESTONE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={styles.pill} onClick={() => setEditing({ id: m.id, title: m.title, notes: m.notes, startsOn: m.startsOn ?? "", dueOn: m.dueOn, status: m.status })}>
                      Edit Milestone
                    </button>
                  </div>
                </div>
                {m.notes && (
                  <p className={t.msNotes}>
                    <span className={t.notesLabel}>Notes</span>
                    {m.notes}
                  </p>
                )}
              </div>

              <div>
                <div className={t.listHead}>
                  <h4 className={t.listTitle}>Tasks</h4>
                  <span className={t.listCount}>
                    {done} of {m.subtasks.length} done
                  </span>
                </div>
                {m.subtasks.length > 0 && (
                  <div className={t.taskHead} aria-hidden="true">
                    <span className={t.aId} />
                    <span className={t.aTitle}>Task</span>
                    <span className={t.aWho}>Assignee</span>
                    <span className={t.aDue}>Due</span>
                    <span className={t.aState}>Status</span>
                    <span className={t.aDel} />
                  </div>
                )}
                {m.subtasks.map((s) => (
                  <div key={`${s.id}-${s.title}-${s.assigneeId}-${s.assigneeName}`} className={t.task}>
                    <span className={`${t.itemId} ${t.aId}`}>T{s.number}</span>
                    <span className={t.aTitle}>
                      <InlineText value={s.title} label={`Title of task T${s.number}`} onCommit={(title) => call(updateSubtaskAction(s.id, { title }))} />
                    </span>
                    <span className={t.aWho}>
                      <AssigneePicker task={s} members={members} disabled={busy} onChange={(patch) => call(updateSubtaskAction(s.id, patch))} />
                    </span>
                    <input className={`${styles.inp} ${styles.inpSmall} ${t.ctl} ${t.aDue}`} type="date" aria-label={`Due date of task T${s.number}`} max={m.dueOn} value={s.dueOn ?? ""} disabled={busy} onChange={(e) => call(updateSubtaskAction(s.id, { dueOn: e.target.value || null }))} />
                    <select className={`${styles.inp} ${styles.inpSmall} ${t.ctl} ${t.aState}`} aria-label={`Status of task T${s.number}`} value={s.status} disabled={busy} onChange={(e) => call(updateSubtaskAction(s.id, { status: e.target.value as MilestoneStatus }))}>
                      {MILESTONE_STATUSES.map((o) => (
                        <option key={o} value={o}>
                          {STATUS_LABEL[o]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={`${styles.ico} ${t.aDel}`} aria-label={`Delete task T${s.number}`} title="Delete Task" disabled={busy} onClick={() => call(deleteSubtaskAction(s.id), "Task deleted")}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {m.subtasks.length === 0 && <p className={t.none}>No tasks.</p>}
                <AddRow placeholder="Task title" action="Add Task" onAdd={(title) => call(addSubtaskAction({ milestoneId: m.id, title }), "Task added")} />
              </div>

              <div>
                <div className={t.listHead}>
                  <h4 className={t.listTitle}>Blockers</h4>
                  <span className={t.listCount}>{open} open</span>
                </div>
                {m.blockers.map((b) => (
                  <div key={`${b.id}-${b.description}`} className={t.blocker}>
                    <span className={`${t.itemId} ${t.aId}`}>B{b.number}</span>
                    <span className={t.aState}>{b.status === "open" ? <State tone="warn">Open</State> : <State tone="ok">Resolved</State>}</span>
                    <span className={t.aText}>
                      <InlineText value={b.description} label={`Description of blocker B${b.number}`} onCommit={(description) => call(updateBlockerAction(b.id, { description }))} />
                    </span>
                    <button type="button" className={`${styles.pill} ${t.aAct}`} disabled={busy} onClick={() => call(updateBlockerAction(b.id, { status: b.status === "open" ? "resolved" : "open" }))}>
                      {b.status === "open" ? "Resolve Blocker" : "Reopen Blocker"}
                    </button>
                    <button type="button" className={`${styles.ico} ${t.aDel}`} aria-label={`Delete blocker B${b.number}`} title="Delete Blocker" disabled={busy} onClick={() => call(deleteBlockerAction(b.id), "Blocker deleted")}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {m.blockers.length === 0 && <p className={t.none}>No blockers.</p>}
                <AddRow placeholder="Blocker description" action="Add Blocker" onAdd={(description) => call(addBlockerAction({ milestoneId: m.id, description }), "Blocker added")} />
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Telegram and Meetings</h2>
        <div className={t.facts}>
          <div className={t.fact}>
            <span className={t.factTitle}>Telegram Chat</span>
            {chatLink ? (
              <>
                <span className={t.factValue}>Open the link, then pick Group {group.number}&apos;s chat</span>
                <span className={styles.hint}>Telegram adds the bot to the chosen chat and connects it to this project group. The link works once, for 10 minutes.</span>
                <div className={t.factActions}>
                  <a className={t.tgBtn} href={chatLink} target="_blank" rel="noopener noreferrer">
                    <Send size={16} strokeWidth={2} aria-hidden="true" />
                    Open in Telegram
                  </a>
                  <button type="button" className={styles.lnk} onClick={() => (setChatLink(null), router.refresh())}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <State tone={group.chatId ? "ok" : "muted"}>{group.chatId ? "Connected" : "Not connected"}</State>
                <span className={styles.hint}>
                  {group.chatId ? "Everyone in the chat has member rights for this project group." : "Members use the bot in the project group's Telegram chat once it is connected."}
                </span>
                {group.chatId && <span className={styles.hint}>Chat ID {group.chatId}</span>}
                <div className={t.factActions}>
                  <button type="button" className={t.tgBtn} disabled={busy} onClick={connectChat}>
                    <Send size={16} strokeWidth={2} aria-hidden="true" />
                    {group.chatId ? "Change Chat" : "Connect Telegram Chat"}
                  </button>
                  {group.chatId && (
                    <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy} onClick={async () => (await confirm({ title: "Disconnect Chat", body: "The bot stops listening in this chat until a chat is connected again.", action: "Disconnect Chat", danger: true })) && call(disconnectChatAction(group.id), "Chat disconnected")}>
                      Disconnect Chat
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className={t.fact}>
            <span className={t.factTitle}>Last Mentor Meeting</span>
            <span className={t.factValue}>{group.lastMeeting}</span>
            <span className={styles.hint}>Next meeting due by {group.nextBy}.</span>
            <label className={t.factField}>
              Meeting Date
              <input className={`${styles.inp} ${styles.inpSmall}`} type="date" max={today} value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </label>
            <div className={t.factActions}>
              <button type="button" className={styles.pill} disabled={busy || !meetingDate} onClick={() => call(logMeetingAction(group.id, meetingDate), "Meeting logged")}>
                Log Meeting
              </button>
            </div>
          </div>
          <div className={t.fact}>
            <span className={t.factTitle}>Reminders</span>
            <label className={t.toggle}>
              <input type="checkbox" role="switch" checked={group.remindersOn} disabled={busy} onChange={(e) => call(setMeetingRemindersAction(group.id, e.target.checked), e.target.checked ? "Reminders on" : "Reminders off")} />
              <span className={t.toggleTrack} aria-hidden="true" />
              {group.remindersOn ? "On" : "Off"}
            </label>
            <span className={styles.hint}>Posted in the chat: the mentor meeting after 3 weeks, and a task a week before its deadline and once it is overdue.</span>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <h2 className={styles.h2}>Members</h2>
          <p className={styles.sectionHint}>Offered as task assignees. Bot access comes from membership of the Telegram chat, not this list.</p>
        </div>
        <div>
          {members.map((m) => (
            <div key={m.id} className={t.item}>
              <InlineText value={m.name} label={`Name of ${m.name}`} onCommit={(name) => call(saveMemberAction({ id: m.id, groupId: group.id, name }))} />
              <button type="button" className={styles.ico} aria-label={`Remove ${m.name}`} title="Remove Member" disabled={busy} onClick={() => call(deleteMemberAction(m.id), "Member removed")}>
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ))}
          {members.length === 0 && <p className={t.none}>No members.</p>}
          <AddRow placeholder="Member name" action="Add Member" onAdd={(name) => call(saveMemberAction({ groupId: group.id, name }), "Member added")} />
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Project Group Details</h2>
        <div className={styles.grid2}>
          <label className={styles.fld}>
            Number
            <input className={styles.inp} type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} />
            <span className={styles.hint}>Used in bot commands, e.g. /milestones g{form.number}.</span>
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
        <div className={styles.between}>
          <div className={styles.row}>
            <button type="button" className={styles.btn} disabled={busy || !dirty} onClick={() => call(saveProjectGroupAction({ id: group.id, cohortId, ...form }), "Project group saved")}>
              Save Project Group
            </button>
            <UnsavedNote show={dirty} onDiscard={() => setForm({ number: group.number, name: group.name, mentors: group.mentors })} />
          </div>
          <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} disabled={busy} onClick={removeGroup}>
            Delete Project Group
          </button>
        </div>
      </section>

      {editing && (
        <Modal
          title={editing.id ? `Edit Milestone M${editingMilestone?.number ?? ""}` : "Add Milestone"}
          onClose={() => setEditing(null)}
          onSubmit={() => !busy && saveMilestone()}
          footer={
            <>
              {editingMilestone && (
                <button
                  type="button"
                  className={`${styles.lnk} ${styles.lnkDanger}`}
                  style={{ marginRight: "auto" }}
                  disabled={busy}
                  onClick={() => removeMilestone({ id: editingMilestone.id, title: editingMilestone.title, tasks: editingMilestone.subtasks.length, blockers: editingMilestone.blockers.length })}
                >
                  Delete Milestone
                </button>
              )}
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
              <span className={styles.hint}>Optional. Without one, the timeline shows a marker on the due date.</span>
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
