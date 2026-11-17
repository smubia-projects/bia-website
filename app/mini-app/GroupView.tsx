"use client";

import { useState } from "react";
import { Bell, BellOff, CalendarCheck, CalendarDays, CircleAlert, CircleCheck, Circle, CircleDot, Pencil, Plus, TriangleAlert, User } from "lucide-react";
import { day, daysBetween, todayIso, type Blocker, type Milestone, type Status, type Task, type Timeline } from "./api";
import { BlockerSheet, MeetingSheet, MilestoneSheet, TaskSheet, type Act } from "./forms";
import styles from "./mini-app.module.css";

const STATUS_LABEL: Record<Status, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const STATUS_ICON = { todo: Circle, in_progress: CircleDot, done: CircleCheck } as const;

type Open =
  | { kind: "milestone"; milestone?: Milestone }
  | { kind: "task"; milestone: Milestone; task?: Task }
  | { kind: "blocker"; milestone: Milestone; blocker?: Blocker }
  | { kind: "meeting" }
  | null;

function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className={styles.meter} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
      <span style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
    </div>
  );
}

function Tile({ label, value, of, caption, tone, children }: { label: string; value: string; of?: number; caption?: string; tone?: "alert"; children?: React.ReactNode }) {
  return (
    <div className={`${styles.tile} ${tone === "alert" ? styles.tileAlert : ""}`}>
      <p className={styles.eyebrow}>{label}</p>
      <p className={styles.figure}>
        {value}
        {of !== undefined && <span className={styles.of}> / {of}</span>}
      </p>
      {children}
      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}

export default function GroupView({ timeline, act, notify }: { timeline: Timeline; act: Act; notify: (message: string, error?: boolean) => void }) {
  const [open, setOpen] = useState<Open>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { milestones, meeting, can, members } = timeline;
  const today = todayIso();
  const close = () => setOpen(null);

  const tasks = milestones.flatMap((m) => m.tasks);
  const openBlockers = milestones.reduce((n, m) => n + m.blockers.filter((b) => b.status === "open").length, 0);
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const doneMilestones = milestones.filter((m) => m.status === "done").length;
  const daysToMeeting = daysBetween(today, meeting.dueBy);

  /** One-tap change from a list row: the control is disabled while it runs, and a refusal is shown as a notice. */
  async function quick(key: string, action: string, fields: object) {
    setPending(key);
    const refused = await act(action, fields);
    setPending(null);
    if (refused) notify(refused, true);
  }

  return (
    <>
      <section className={styles.tiles} aria-label="Summary">
        <Tile label="Milestones" value={String(doneMilestones)} of={milestones.length} caption="Completed">
          <Progress done={doneMilestones} total={milestones.length} label="Milestones completed" />
        </Tile>
        <Tile label="Tasks" value={String(doneTasks)} of={tasks.length} caption="Completed">
          <Progress done={doneTasks} total={tasks.length} label="Tasks completed" />
        </Tile>
        <Tile label="Open Blockers" value={String(openBlockers)} tone={openBlockers ? "alert" : undefined} caption={openBlockers ? "Needs resolution" : "None open"} />
        <Tile
          label="Mentor Meeting"
          value={meeting.lastOn ? day(meeting.lastOn) : "Not logged"}
          tone={daysToMeeting < 0 ? "alert" : undefined}
          caption={daysToMeeting < 0 ? `Overdue since ${day(meeting.dueBy)}` : `Next by ${day(meeting.dueBy)}, ${daysToMeeting} ${daysToMeeting === 1 ? "day" : "days"}`}
        >
          <button type="button" className={styles.buttonSmall} onClick={() => setOpen({ kind: "meeting" })}>
            <CalendarCheck size={16} strokeWidth={1.75} aria-hidden />
            Log Meeting
          </button>
        </Tile>
      </section>

      {can.manage && (
        <section className={styles.setting}>
          <div>
            <h3 className={styles.rowTitle}>Reminders</h3>
            <p className={styles.caption}>Meeting and task deadline alerts in the group chat</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={meeting.reminders}
            aria-label="Reminders"
            className={styles.switch}
            disabled={pending === "reminders"}
            onClick={() => quick("reminders", "reminders.set", { on: !meeting.reminders })}
          >
            {meeting.reminders ? <Bell size={14} strokeWidth={2} aria-hidden /> : <BellOff size={14} strokeWidth={2} aria-hidden />}
            <span aria-hidden />
          </button>
        </section>
      )}

      <section aria-labelledby="milestones-title">
        <div className={styles.sectionHead}>
          <h2 id="milestones-title" className={styles.h2}>
            Milestones
          </h2>
          {can.manage && (
            <button type="button" className={styles.buttonSmall} onClick={() => setOpen({ kind: "milestone" })}>
              <Plus size={16} strokeWidth={2} aria-hidden />
              Add Milestone
            </button>
          )}
        </div>

        {milestones.length === 0 && <p className={styles.empty}>No milestones recorded for this project group.</p>}

        {milestones.map((m) => {
          const Icon = STATUS_ICON[m.status];
          const done = m.tasks.filter((t) => t.status === "done").length;
          const left = daysBetween(today, m.dueOn);
          const late = m.status !== "done" && left < 0;
          return (
            <article key={m.number} className={`${styles.card} ${m.status === "done" ? styles.cardDone : ""}`}>
              <header className={styles.cardHead}>
                <div className={styles.cardTitle}>
                  <p className={styles.eyebrow}>M{m.number}</p>
                  <h3 className={styles.h3}>{m.title}</h3>
                </div>
                <span className={`${styles.badge} ${styles[`badge_${m.status}`]}`}>
                  <Icon size={14} strokeWidth={2} aria-hidden />
                  {STATUS_LABEL[m.status]}
                </span>
                {can.manage && (
                  <button type="button" className={styles.iconButton} aria-label={`Edit milestone M${m.number}`} onClick={() => setOpen({ kind: "milestone", milestone: m })}>
                    <Pencil size={18} strokeWidth={1.75} />
                  </button>
                )}
              </header>

              <p className={`${styles.meta} ${late ? styles.metaAlert : ""}`}>
                <CalendarDays size={14} strokeWidth={1.75} aria-hidden />
                {m.startsOn ? `${day(m.startsOn)} to ${day(m.dueOn)}` : `Due ${day(m.dueOn)}`}
                {late && <strong>Overdue</strong>}
              </p>
              {m.notes && <p className={styles.notes}>{m.notes}</p>}

              <div className={styles.progressRow}>
                <Progress done={done} total={m.tasks.length} label={`M${m.number} tasks completed`} />
                <span className={styles.caption}>
                  {done} / {m.tasks.length} tasks
                </span>
              </div>

              <ul className={styles.list} aria-label={`Tasks of M${m.number}`}>
                {m.tasks.map((t) => {
                  const TaskIcon = STATUS_ICON[t.status];
                  const overdue = t.status !== "done" && t.dueOn !== null && t.dueOn < today;
                  const key = `t${t.number}`;
                  return (
                    <li key={t.number} className={styles.item}>
                      <button
                        type="button"
                        className={`${styles.check} ${styles[`check_${t.status}`]}`}
                        aria-label={`T${t.number} is ${STATUS_LABEL[t.status]}. ${t.status === "done" ? "Mark as To Do" : "Mark as Done"}`}
                        disabled={pending === key}
                        onClick={() => quick(key, "task.save", { number: t.number, status: t.status === "done" ? "todo" : "done" })}
                      >
                        <TaskIcon size={22} strokeWidth={1.75} aria-hidden />
                      </button>
                      <button type="button" className={styles.itemBody} onClick={() => setOpen({ kind: "task", milestone: m, task: t })}>
                        <span className={styles.itemTitle}>
                          <span className={styles.tag}>T{t.number}</span>
                          {t.title}
                        </span>
                        {(t.dueOn || t.assignee) && (
                          <span className={styles.itemMeta}>
                            {t.assignee && (
                              <span>
                                <User size={13} strokeWidth={1.75} aria-hidden />
                                {t.assignee}
                              </span>
                            )}
                            {t.dueOn && (
                              <span className={overdue ? styles.metaAlert : undefined}>
                                <CalendarDays size={13} strokeWidth={1.75} aria-hidden />
                                {day(t.dueOn)}
                                {overdue && <strong>Overdue</strong>}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {m.tasks.length === 0 && <li className={styles.none}>No tasks</li>}
              </ul>
              <button type="button" className={styles.buttonGhost} onClick={() => setOpen({ kind: "task", milestone: m })}>
                <Plus size={16} strokeWidth={2} aria-hidden />
                Add Task
              </button>

              <h4 className={styles.h4}>Blockers</h4>
              <ul className={styles.list} aria-label={`Blockers of M${m.number}`}>
                {m.blockers.map((b) => (
                  <li key={b.number} className={styles.item}>
                    <span className={`${styles.blockerIcon} ${b.status === "open" ? styles.blockerOpen : styles.blockerResolved}`} aria-hidden>
                      {b.status === "open" ? <TriangleAlert size={20} strokeWidth={1.75} /> : <CircleCheck size={20} strokeWidth={1.75} />}
                    </span>
                    <button type="button" className={styles.itemBody} onClick={() => setOpen({ kind: "blocker", milestone: m, blocker: b })}>
                      <span className={styles.itemTitle}>
                        <span className={styles.tag}>B{b.number}</span>
                        {b.description}
                      </span>
                      <span className={styles.itemMeta}>
                        <span className={b.status === "open" ? styles.metaAlert : undefined}>
                          <CircleAlert size={13} strokeWidth={1.75} aria-hidden />
                          {b.status === "open" ? "Open" : "Resolved"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {m.blockers.length === 0 && <li className={styles.none}>No blockers</li>}
              </ul>
              <button type="button" className={styles.buttonGhost} onClick={() => setOpen({ kind: "blocker", milestone: m })}>
                <Plus size={16} strokeWidth={2} aria-hidden />
                Add Blocker
              </button>
            </article>
          );
        })}
      </section>

      {open?.kind === "milestone" && <MilestoneSheet key={open.milestone?.number ?? "new"} milestone={open.milestone} act={act} onClose={close} />}
      {open?.kind === "task" && <TaskSheet key={open.task?.number ?? "new"} milestone={open.milestone} task={open.task} members={members} act={act} onClose={close} />}
      {open?.kind === "blocker" && <BlockerSheet key={open.blocker?.number ?? "new"} milestone={open.milestone} blocker={open.blocker} act={act} onClose={close} />}
      {open?.kind === "meeting" && <MeetingSheet meeting={meeting} act={act} onClose={close} />}
    </>
  );
}
