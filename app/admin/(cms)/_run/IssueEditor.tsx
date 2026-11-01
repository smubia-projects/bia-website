"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Markdown from "@/app/components/ui/Markdown";
import { useClientValue } from "@/app/components/ui/useClient";
import type { IssueBlock } from "@/app/lib/db/schema";
import {
  BLOCK_DEFAULT_HEADING,
  BLOCK_HINTS,
  BLOCK_TYPES,
  ISSUE_STATUS_LABEL,
  type BlockType,
  type IssueStatus,
} from "@/app/lib/cms/taxonomy";
import {
  deleteIssueAction,
  publishIssueAction,
  revertIssueAction,
  saveIssueAction,
  scheduleIssueAction,
  sendIssueTestAction,
  type ActionResult,
} from "../../actions";
import { StatusChip, useActionToast, useImageUpload, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

export interface IssueEditorProps {
  issue: {
    id: number;
    week: number;
    title: string;
    summary: string;
    coverImage: string;
    blocks: IssueBlock[];
    status: IssueStatus;
    publishAt: string | null;
    postToTelegram: boolean;
    telegramPostedAt: string | null;
    path: string;
  };
  sessions: { week: number; topic: string; group: string }[];
  /** The cohort the issue belongs to, for links back to its pages */
  cohortSlug: string;
  takenWeeks: number[];
  botUsername: string;
  telegramReady: boolean;
}

const TG_KEY = "bia-cms-telegram-id";

/** The last test-send ID; storage can be unavailable, then the field starts empty. */
function storedTelegramId() {
  try {
    return localStorage.getItem(TG_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Block ids only need to be unique within the issue. */
const nextBlockId = (blocks: IssueBlock[]) =>
  `b${Math.max(0, ...blocks.map((b) => Number(b.id.replace(/\D/g, "")) || 0)) + 1}`;

const sgDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date(iso)) : "";
const today = () => sgDate(new Date().toISOString());

export default function IssueEditor({ cohortSlug, issue, sessions, takenWeeks, botUsername, telegramReady }: IssueEditorProps) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const uploader = useImageUpload("newsletter");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [saved] = useState(() =>
    JSON.stringify({
      week: issue.week,
      title: issue.title,
      summary: issue.summary,
      coverImage: issue.coverImage,
      blocks: issue.blocks,
      postToTelegram: issue.postToTelegram,
    })
  );
  const [ed, setEd] = useState(() => JSON.parse(saved) as {
    week: number;
    title: string;
    summary: string;
    coverImage: string;
    blocks: IssueBlock[];
    postToTelegram: boolean;
  });
  const [when, setWhen] = useState<"now" | "sched">(issue.status === "scheduled" ? "sched" : "now");
  const [date, setDate] = useState(sgDate(issue.publishAt) || today());
  const storedTgId = useClientValue(storedTelegramId, "");
  const [typedTgId, setTgId] = useState<string | null>(null);
  const tgId = typedTgId ?? storedTgId;
  const [busy, setBusy] = useState(false);

  const weeks = Math.max(10, ...sessions.map((s) => s.week));
  const linked = sessions.find((s) => s.week === ed.week);
  const input = { ...ed };
  const published = issue.status === "published";
  useUnsavedChanges(!busy && JSON.stringify(ed) !== saved);

  const setBlocks = (blocks: IssueBlock[]) => setEd((s) => ({ ...s, blocks }));
  const patchBlock = (id: string, patch: Partial<IssueBlock>) => setBlocks(ed.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= ed.blocks.length) return;
    const next = ed.blocks.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    setBlocks(next);
  };
  const addBlock = (type: BlockType) =>
    setBlocks([...ed.blocks, { id: nextBlockId(ed.blocks), type, heading: BLOCK_DEFAULT_HEADING[type], body: "", ...(type === "Image" ? { image: "" } : {}) }]);

  async function act<T>(fn: () => Promise<ActionResult<T>>, success?: string) {
    setBusy(true);
    const data = handle(await fn(), success);
    setBusy(false);
    if (data !== undefined) router.refresh();
    return data;
  }

  async function publish() {
    if (when === "sched" && !published) {
      await act(() => scheduleIssueAction(issue.id, input, date), `Week ${ed.week} scheduled`);
      return;
    }
    if (published) {
      await act(() => saveIssueAction(issue.id, input), "Changes saved");
      return;
    }
    if (
      ed.postToTelegram &&
      !issue.telegramPostedAt &&
      !confirm(`Publish week ${ed.week} now and post it to the DAP Telegram channel? A Telegram post can't be taken back from here.`)
    ) {
      return;
    }
    setBusy(true);
    const res = await publishIssueAction(issue.id, input);
    setBusy(false);
    if (!res.ok) return show(res.error, true);
    const t = res.data.telegram;
    const tg =
      t === "sent" ? " and posted to Telegram" : t === "dry-run" ? " (Telegram not configured: logged instead)" : t === "not-configured" ? " (TELEGRAM_DAP_CHANNEL_ID isn't set)" : typeof t === "object" ? `. Telegram failed: ${t.error}` : "";
    show(`Week ${res.data.week} published${tg}`, typeof t === "object");
    router.refresh();
  }

  async function sendTest() {
    try {
      localStorage.setItem(TG_KEY, tgId.trim());
    } catch {
      // Not remembered; that's fine.
    }
    const res = await act(() => sendIssueTestAction(issue.id, input, tgId));
    if (res) show(res === "dry-run" ? "Telegram isn't configured here: the message was logged to the server console" : `Test sent to ${tgId.trim()}`);
  }

  async function remove() {
    if (!confirm(`Delete the week ${issue.week} issue? This can't be undone.`)) return;
    const res = handle(await deleteIssueAction(issue.id));
    if (res !== undefined) router.push(runHref("DAP", cohortSlug, "newsletter"));
  }

  const primaryLabel = published ? "Save changes" : when === "sched" ? "Schedule issue" : "Publish now";

  return (
    <>
      <div className={styles.between} style={{ flexWrap: "wrap" }}>
        <Link href={runHref("DAP", cohortSlug, "newsletter")} className={styles.pill}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All issues
        </Link>
        <div role="group" aria-label="Mode" className={styles.row} style={{ gap: 6 }}>
          <button type="button" className={`${styles.pill} ${mode === "write" ? styles.pillOn : ""}`} aria-pressed={mode === "write"} onClick={() => setMode("write")}>
            Write
          </button>
          <button type="button" className={`${styles.pill} ${mode === "preview" ? styles.pillOn : ""}`} aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>
            Preview
          </button>
        </div>
      </div>

      <div className={styles.cols}>
        <div className={styles.colMain}>
          {mode === "write" ? (
            <section className={styles.panel}>
              <div style={{ display: "grid", gridTemplateColumns: "160px minmax(0, 1fr)", gap: 14 }}>
                <label className={styles.fld}>
                  Week
                  <select className={styles.inp} value={ed.week} onChange={(e) => setEd((s) => ({ ...s, week: Number(e.target.value) }))}>
                    {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w} disabled={w !== issue.week && takenWeeks.includes(w)}>
                        Week {w}
                        {w !== issue.week && takenWeeks.includes(w) ? " (has an issue)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fld}>
                  Title
                  <input className={styles.inp} value={ed.title} onChange={(e) => setEd((s) => ({ ...s, title: e.target.value }))} />
                </label>
              </div>
              <div className={styles.linkedSession}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7dd7c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                  <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                </svg>
                <span style={{ flex: 1 }}>
                  {linked?.topic ? (
                    <>
                      Linked session: <strong>{linked.topic}</strong>
                      {linked.group ? ` · taught by ${linked.group}` : ""}
                    </>
                  ) : (
                    `No session set for week ${ed.week}`
                  )}
                </span>
                <Link className={styles.lnk} href={runHref("DAP", cohortSlug, "schedule")}>
                  Edit sessions
                </Link>
              </div>
              <label className={styles.fld}>
                Summary
                <textarea className={styles.inp} rows={2} value={ed.summary} onChange={(e) => setEd((s) => ({ ...s, summary: e.target.value }))} placeholder="One line shown on the newsletter card" />
              </label>
              <div className={styles.monoLabel} style={{ marginTop: 4 }}>
                Sections
              </div>
              {ed.blocks.map((b, idx) => (
                <div key={b.id} className={styles.subItem}>
                  <div className={styles.row} style={{ flexWrap: "nowrap" }}>
                    <span className={styles.blockType}>{b.type}</span>
                    <input
                      className={`${styles.inp} ${styles.inpSmall}`}
                      style={{ flex: 1, width: "auto", fontWeight: 600 }}
                      value={b.heading}
                      placeholder={b.type === "Image" ? "Heading (optional)" : "Section heading"}
                      aria-label="Section heading"
                      onChange={(e) => patchBlock(b.id, { heading: e.target.value })}
                    />
                    <button type="button" className={styles.ico} onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move section up">
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 15l6-6 6 6" />
                      </svg>
                    </button>
                    <button type="button" className={styles.ico} onClick={() => move(idx, 1)} disabled={idx === ed.blocks.length - 1} aria-label="Move section down">
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    <button type="button" className={styles.ico} onClick={() => setBlocks(ed.blocks.filter((x) => x.id !== b.id))} aria-label="Remove section">
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l12 12" />
                        <path d="M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                  {b.type === "Image" && (
                    <button
                      type="button"
                      className={styles.coverPick}
                      disabled={uploader.busy}
                      onClick={async () => {
                        try {
                          const url = await uploader.pick(null);
                          if (url) patchBlock(b.id, { image: url });
                        } catch (e) {
                          show(e instanceof Error ? e.message : "Upload failed", true);
                        }
                      }}
                    >
                      {b.image ? (
                        <Image src={b.image} alt="" width={96} height={54} style={{ objectFit: "cover", borderRadius: 8 }} />
                      ) : null}
                      <span className={styles.coverText}>
                        <span className={styles.coverTitle}>{uploader.busy ? "Uploading…" : b.image ? "Replace image" : "Upload an image"}</span>
                        <span className={styles.hint}>Shown full width, 16:9</span>
                      </span>
                    </button>
                  )}
                  <textarea
                    className={styles.inp}
                    rows={b.type === "Image" ? 2 : 4}
                    value={b.body}
                    placeholder={BLOCK_HINTS[b.type]}
                    aria-label={b.type === "Image" ? "Image caption" : "Section text"}
                    onChange={(e) => patchBlock(b.id, { body: e.target.value })}
                  />
                </div>
              ))}
              <div className={styles.row}>
                {BLOCK_TYPES.map((t) => (
                  <button key={t} type="button" className={styles.add} onClick={() => addBlock(t)}>
                    + {t}
                  </button>
                ))}
              </div>
              <span className={styles.hint}>Section text supports Markdown. Empty sections are left out.</span>
            </section>
          ) : (
            <article className={styles.preview}>
              <div className={styles.previewEyebrow}>This week in DAP · Week {ed.week}</div>
              <h1 className={styles.previewTitle}>{ed.title || "Untitled issue"}</h1>
              <p style={{ margin: "12px 0 0", fontSize: 17, lineHeight: 1.6 }}>{ed.summary || "One-line summary"}</p>
              {linked?.topic && (
                <div className={styles.previewSession}>
                  <div className={styles.monoLabel} style={{ color: "var(--mint)" }}>
                    This week&apos;s co-learning
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, marginTop: 4 }}>{linked.topic}</div>
                  {linked.group && <div style={{ fontSize: 14, color: "var(--pine-text-soft)" }}>Taught by {linked.group}</div>}
                </div>
              )}
              {ed.blocks.map((b) =>
                b.type === "Image" ? (
                  b.image ? (
                    <figure key={b.id} style={{ margin: "26px 0 0" }}>
                      {b.heading && <h2 className={styles.previewHeading}>{b.heading}</h2>}
                      <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 14, overflow: "hidden" }}>
                        <Image src={b.image} alt="" fill sizes="700px" style={{ objectFit: "cover" }} />
                      </div>
                      {b.body && <figcaption className={styles.hint} style={{ marginTop: 8, fontSize: 13 }}>{b.body}</figcaption>}
                    </figure>
                  ) : null
                ) : (
                  <section key={b.id}>
                    {b.heading && <h2 className={styles.previewHeading}>{b.heading}</h2>}
                    {b.body.trim() ? <Markdown content={b.body} /> : <p className={styles.hint}>[{BLOCK_HINTS[b.type]}]</p>}
                  </section>
                )
              )}
            </article>
          )}
        </div>

        <aside className={styles.colSide}>
          <div className={styles.panelTight}>
            <div className={styles.between}>
              <span className={styles.legend} style={{ padding: 0 }}>
                Status
              </span>
              <StatusChip status={issue.status} label={ISSUE_STATUS_LABEL[issue.status]} />
            </div>
            {published ? (
              <span className={styles.hint}>
                Live at{" "}
                <a className={styles.lnk} style={{ padding: 0, minHeight: 0 }} href={issue.path} target="_blank" rel="noopener noreferrer">
                  {issue.path}
                </a>
                {issue.telegramPostedAt ? ". Posted to Telegram." : "."}
              </span>
            ) : (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>When</legend>
                <label className={styles.radio}>
                  <input type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} />
                  Publish now
                </label>
                <label className={styles.radio}>
                  <input type="radio" name="when" checked={when === "sched"} onChange={() => setWhen("sched")} />
                  Schedule
                </label>
                {when === "sched" && (
                  <>
                    <input className={styles.inp} type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} aria-label="Publish date" style={{ marginTop: 4 }} />
                    <span className={styles.hint} style={{ marginTop: 4 }}>
                      Goes out at about 9am SGT on this date (±1 hour).
                    </span>
                  </>
                )}
              </fieldset>
            )}
            {!issue.telegramPostedAt && (
              <label className={styles.radio} style={{ alignItems: "flex-start", lineHeight: 1.4 }}>
                <input type="checkbox" checked={ed.postToTelegram} onChange={(e) => setEd((s) => ({ ...s, postToTelegram: e.target.checked }))} style={{ marginTop: 2 }} />
                <span>
                  Also post it to the DAP Telegram channel
                  <br />
                  <span className={styles.hint}>Posted once by the club bot{published ? " (only when first published)" : ""}</span>
                </span>
              </label>
            )}
            <button type="button" className={styles.btn} onClick={publish} disabled={busy || !ed.title.trim()}>
              {busy ? "Working…" : primaryLabel}
            </button>
            {published || issue.status === "scheduled" ? (
              <button type="button" className={styles.pill} disabled={busy} onClick={() => {
                if (published && !confirm(`Unpublish week ${issue.week}? It disappears from the newsletter page. A Telegram post stays up.`)) return;
                act(() => revertIssueAction(issue.id), published ? "Unpublished" : "Schedule cancelled");
              }}>
                {published ? "Unpublish" : "Cancel schedule"}
              </button>
            ) : (
              <button type="button" className={styles.pill} disabled={busy} onClick={() => act(() => saveIssueAction(issue.id, input), "Draft saved")}>
                Save draft
              </button>
            )}
          </div>

          <div className={styles.panelTight}>
            <span className={styles.legend} style={{ padding: 0 }}>
              Send a test
            </span>
            <span className={styles.hint}>
              Sends this issue, as the channel would see it, to one Telegram user. They must have sent <strong>/start</strong> to{" "}
              {botUsername ? `@${botUsername}` : "the club bot"} first.
              {!telegramReady && " (No bot token here: tests are logged to the server console.)"}
            </span>
            <div className={styles.row} style={{ flexWrap: "nowrap" }}>
              <input
                className={`${styles.inp} ${styles.inpSmall}`}
                inputMode="numeric"
                placeholder="Telegram user ID"
                aria-label="Telegram user ID"
                value={tgId}
                onChange={(e) => setTgId(e.target.value)}
              />
              <button type="button" className={styles.pill} disabled={busy || !tgId.trim()} onClick={sendTest}>
                Send test
              </button>
            </div>
            <span className={styles.hint}>Find your ID by messaging @userinfobot on Telegram.</span>
          </div>

          <div className={styles.panelTight}>
            <span className={styles.legend} style={{ padding: 0 }}>
              Cover image
            </span>
            <button
              type="button"
              className={styles.coverPick}
              disabled={uploader.busy}
              onClick={async () => {
                try {
                  const url = await uploader.pick({ ratio: 16 / 9, label: "16:9 · cover" });
                  if (url) setEd((s) => ({ ...s, coverImage: url }));
                } catch (e) {
                  show(e instanceof Error ? e.message : "Upload failed", true);
                }
              }}
            >
              {ed.coverImage ? <Image src={ed.coverImage} alt="" width={96} height={54} style={{ objectFit: "cover", borderRadius: 8 }} /> : null}
              <span className={styles.coverText}>
                <span className={styles.coverTitle}>{ed.coverImage ? "Replace cover" : "Add a cover image"}</span>
                <span className={styles.hint}>Used for the Telegram post and link previews</span>
              </span>
            </button>
          </div>

          {!published && (
            <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} style={{ alignSelf: "flex-start" }} onClick={remove}>
              Delete issue
            </button>
          )}
        </aside>
      </div>
      {uploader.cropper}
      {node}
    </>
  );
}
