"use client";

import { useState } from "react";
import { day, todayIso, type Blocker, type Milestone, type Status, type Task, type Timeline } from "./api";
import { Field, Segmented, Sheet, SheetForm } from "./Sheet";
import styles from "./mini-app.module.css";

/** Sends one change; resolves to an error message, or null when it went through. */
export type Act = (action: string, fields: object) => Promise<string | null>;

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const OTHER = "other";

export function TaskSheet({ milestone, task, members, act, onClose }: { milestone: Milestone; task?: Task; members: Timeline["members"]; act: Act; onClose: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [status, setStatus] = useState<Status>(task?.status ?? "todo");
  const [dueOn, setDueOn] = useState(task?.dueOn ?? "");
  const [who, setWho] = useState(task?.assigneeId ? String(task.assigneeId) : task?.assignee ? OTHER : "");
  const [typed, setTyped] = useState(task && !task.assigneeId ? task.assignee : "");

  const assignee = who === OTHER ? { assigneeName: typed } : { assigneeId: who ? Number(who) : null };
  return (
    <Sheet eyebrow={`M${milestone.number} ${milestone.title}`} title={task ? `Edit Task T${task.number}` : "Add Task"} onClose={onClose}>
      <SheetForm
        submit={task ? "Save Task" : "Add Task"}
        onClose={onClose}
        onSubmit={() => act("task.save", { number: task?.number, milestone: milestone.number, title, status, ...(dueOn !== (task?.dueOn ?? "") || !task ? { dueOn } : {}), ...assignee })}
        remove={task && { label: "Delete Task", warning: `Delete task T${task.number} ${task.title}? This cannot be undone.`, run: () => act("task.delete", { number: task.number }) }}
      >
        <Field label="Title">
          <textarea className={styles.input} rows={2} maxLength={200} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Segmented label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
        <Field label="Due Date" hint={`Latest ${day(milestone.dueOn)}, the due date of M${milestone.number}`}>
          <input className={styles.input} type="date" max={milestone.dueOn} value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        </Field>
        <Field label="Assignee">
          <select className={styles.input} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value={OTHER}>Other name</option>
          </select>
        </Field>
        {who === OTHER && (
          <Field label="Assignee Name">
            <input className={styles.input} maxLength={80} required value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
        )}
      </SheetForm>
    </Sheet>
  );
}

export function BlockerSheet({ milestone, blocker, act, onClose }: { milestone: Milestone; blocker?: Blocker; act: Act; onClose: () => void }) {
  const [description, setDescription] = useState(blocker?.description ?? "");
  const [status, setStatus] = useState(blocker?.status ?? "open");
  return (
    <Sheet eyebrow={`M${milestone.number} ${milestone.title}`} title={blocker ? `Edit Blocker B${blocker.number}` : "Add Blocker"} onClose={onClose}>
      <SheetForm
        submit={blocker ? "Save Blocker" : "Add Blocker"}
        onClose={onClose}
        onSubmit={() => act("blocker.save", { number: blocker?.number, milestone: milestone.number, description, ...(blocker ? { status } : {}) })}
        remove={blocker && { label: "Delete Blocker", warning: `Delete blocker B${blocker.number}? This cannot be undone.`, run: () => act("blocker.delete", { number: blocker.number }) }}
      >
        <Field label="Description">
          <textarea className={styles.input} rows={3} maxLength={500} required value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {blocker && (
          <Segmented
            label="Status"
            value={status}
            options={[
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
            ]}
            onChange={setStatus}
          />
        )}
      </SheetForm>
    </Sheet>
  );
}

export function MilestoneSheet({ milestone, act, onClose }: { milestone?: Milestone; act: Act; onClose: () => void }) {
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [startsOn, setStartsOn] = useState(milestone?.startsOn ?? "");
  const [dueOn, setDueOn] = useState(milestone?.dueOn ?? "");
  const [notes, setNotes] = useState(milestone?.notes ?? "");
  const [status, setStatus] = useState<Status>(milestone?.status ?? "todo");
  return (
    <Sheet eyebrow="Milestone" title={milestone ? `Edit Milestone M${milestone.number}` : "Add Milestone"} onClose={onClose}>
      <SheetForm
        submit={milestone ? "Save Milestone" : "Add Milestone"}
        onClose={onClose}
        onSubmit={() => act("milestone.save", { number: milestone?.number, title, startsOn, dueOn, notes, ...(milestone ? { status } : {}) })}
        remove={
          milestone && {
            label: "Delete Milestone",
            warning: `Delete milestone M${milestone.number} with its ${milestone.tasks.length} tasks and ${milestone.blockers.length} blockers? This cannot be undone.`,
            run: () => act("milestone.delete", { number: milestone.number }),
          }
        }
      >
        <Field label="Title">
          <input className={styles.input} maxLength={200} required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className={styles.pair}>
          <Field label="Start Date">
            <input className={styles.input} type="date" max={dueOn || undefined} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </Field>
          <Field label="Due Date">
            <input className={styles.input} type="date" required min={startsOn || undefined} value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className={styles.input} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {milestone && <Segmented label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />}
      </SheetForm>
    </Sheet>
  );
}

export function MeetingSheet({ meeting, act, onClose }: { meeting: Timeline["meeting"]; act: Act; onClose: () => void }) {
  const today = todayIso();
  const [date, setDate] = useState(today);
  return (
    <Sheet eyebrow="Mentor Meeting" title="Log Meeting" onClose={onClose}>
      <SheetForm submit="Log Meeting" onClose={onClose} onSubmit={() => act("meeting.log", { date })}>
        <Field label="Meeting Date" hint={meeting.lastOn ? `Last logged ${day(meeting.lastOn)}` : "No meeting logged yet"}>
          <input className={styles.input} type="date" required max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </SheetForm>
    </Sheet>
  );
}
