"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronUp, Eye, Link2, PenLine, X } from "lucide-react";
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
import { AddButton, MarkdownHint, PageHead, StatusChip, UnsavedNote, useActionToast, useConfirm, useImageUpload, useSaveShortcut, useUnsavedChanges } from "../../_components/ui";
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
  const confirm = useConfirm();
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
  const dirty = JSON.stringify(ed) !== saved;
  useUnsavedChanges(!busy && dirty);

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
      !(await confirm({ title: "Publish and Post to Telegram", body: `Week ${ed.week} goes live and posts to the DAP Telegram channel. Telegram posts cannot be removed from the CMS.`, action: "Publish and Post" }))
    ) {
      return;
    }
    setBusy(true);
    const res = await publishIssueAction(issue.id, input);
    setBusy(false);
    if (!res.ok) return show(res.error, true);
    const t = res.data.telegram;
    const tg =
      t === "sent" ? " and posted to Telegram" : t === "dry-run" ? ". Telegram not configured: message logged to the server console" : t === "not-configured" ? ". Telegram not posted: set TELEGRAM_DAP_CHANNEL_ID" : typeof t === "object" ? `. Telegram failed: ${t.error}` : "";
    show(`Week ${res.data.week} published${tg}`, typeof t === "object");
  }

  async function sendTest() {
    try {
      localStorage.setItem(TG_KEY, tgId.trim());
    } catch {
      // Not remembered; that's fine.
    }
    const res = await act(() => sendIssueTestAction(issue.id, input, tgId));
    if (res) show(res === "dry-run" ? "Telegram not configured: message logged to the server console" : `Test sent to ${tgId.trim()}`);
  }

  async function remove() {
    if (!(await confirm({ title: "Delete Issue", body: `The week ${issue.week} issue is permanently deleted. This cannot be undone.`, action: "Delete Issue", danger: true }))) return;
    const res = handle(await deleteIssueAction(issue.id), "Issue deleted");
    if (res !== undefined) router.push(runHref("DAP", cohortSlug, "newsletter"));
  }

  const primaryLabel = published ? "Save Changes" : when === "sched" ? (issue.status === "scheduled" ? "Update Schedule" : "Schedule Issue") : "Publish Now";
  // Saves without changing status: Ctrl+S never publishes.
  useSaveShortcut(() => act(() => saveIssueAction(issue.id, input), published ? "Changes saved" : "Draft saved"), dirty && !busy && Boolean(ed.title.trim()));

  return (
    <>
      <PageHead crumbs={[{ href: runHref("DAP", cohortSlug, "newsletter"), label: "Newsletter" }]} title={issue.title || `Week ${issue.week}`}>
        <div role="group" aria-label="Editor view" className={styles.switch}>
          <button type="button" className={`${styles.switchBtn} ${mode === "write" ? styles.switchOn : ""}`} aria-pressed={mode === "write"} aria-label="Edit" title="Edit" onClick={() => setMode("write")}>
            <PenLine size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" className={`${styles.switchBtn} ${mode === "preview" ? styles.switchOn : ""}`} aria-pressed={mode === "preview"} aria-label="Preview" title="Preview" onClick={() => setMode("preview")}>
            <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </PageHead>

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
                        {w !== issue.week && takenWeeks.includes(w) ? " (issue exists)" : ""}
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
                <Link2 size={18} strokeWidth={1.75} color="var(--mint)" aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  {linked?.topic ? (
                    <>
                      Linked session: <strong>{linked.topic}</strong>
                      {linked.group ? ` · ${linked.group}` : ""}
                    </>
                  ) : (
                    `No session for week ${ed.week}`
                  )}
                </span>
                <Link className={styles.lnk} href={runHref("DAP", cohortSlug, "schedule")}>
                  Edit Schedule
                </Link>
              </div>
              <label className={styles.fld}>
                Summary
                <textarea className={styles.inp} rows={2} value={ed.summary} onChange={(e) => setEd((s) => ({ ...s, summary: e.target.value }))} />
                <span className={styles.hint}>One line. Shown on the newsletter card.</span>
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
                      <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.ico} onClick={() => move(idx, 1)} disabled={idx === ed.blocks.length - 1} aria-label="Move section down">
                      <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.ico} onClick={() => setBlocks(ed.blocks.filter((x) => x.id !== b.id))} aria-label="Remove section">
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                  {b.type === "Image" && (
                    <button
                      type="button"
                      className={styles.coverPick}
                      disabled={uploader.busy}
                      onClick={async () => {
                        try {
                          const url = await uploader.pick({ ratio: 16 / 9, label: "16:9 · section image" });
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
                        <span className={styles.coverTitle}>{uploader.busy ? "Uploading…" : b.image ? "Replace Image" : "Upload Image"}</span>
                        <span className={styles.hint}>16:9. Shown full width.</span>
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
                  <AddButton key={t} label={`Add ${t}`} onClick={() => addBlock(t)} />
                ))}
              </div>
              <MarkdownHint>Empty sections are omitted.</MarkdownHint>
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
                Public URL:{" "}
                <a className={styles.lnk} style={{ padding: 0, minHeight: 0 }} href={issue.path} target="_blank" rel="noopener noreferrer">
                  {issue.path}
                </a>
                {issue.telegramPostedAt ? ". Posted to Telegram." : ""}
              </span>
            ) : (
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>Publish Time</legend>
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
                      Publishes at 09:00 SGT (±1 h) on this date.
                    </span>
                  </>
                )}
              </fieldset>
            )}
            {!issue.telegramPostedAt && (
              <label className={styles.radio} style={{ alignItems: "flex-start", lineHeight: 1.4 }}>
                <input type="checkbox" checked={ed.postToTelegram} onChange={(e) => setEd((s) => ({ ...s, postToTelegram: e.target.checked }))} style={{ marginTop: 2 }} />
                <span>
                  Post to DAP Telegram Channel
                  <br />
                  <span className={styles.hint}>Posted once by the club bot{published ? ", on first publish only" : ""}.</span>
                </span>
              </label>
            )}
            <button type="button" className={styles.btn} onClick={publish} disabled={busy || !ed.title.trim()}>
              {busy ? "Saving…" : primaryLabel}
            </button>
            <UnsavedNote show={dirty} onDiscard={() => setEd(JSON.parse(saved))} />
            {published || issue.status === "scheduled" ? (
              <button type="button" className={styles.pill} disabled={busy} onClick={async () => {
                if (published && !(await confirm({ title: "Unpublish Issue", body: `Week ${issue.week} is removed from the newsletter page. Any Telegram post stays up.`, action: "Unpublish Issue", danger: true }))) return;
                act(() => revertIssueAction(issue.id), published ? "Issue unpublished" : "Schedule cancelled");
              }}>
                {published ? "Unpublish" : "Cancel Schedule"}
              </button>
            ) : (
              <button type="button" className={styles.pill} disabled={busy} onClick={() => act(() => saveIssueAction(issue.id, input), "Draft saved")}>
                Save Draft
              </button>
            )}
          </div>

          <div className={styles.panelTight}>
            <span className={styles.legend} style={{ padding: 0 }}>
              Test Send
            </span>
            <span className={styles.hint}>
              Saves this issue, then sends the channel post to one Telegram user, who must have sent <strong>/start</strong> to{" "}
              {botUsername ? `@${botUsername}` : "the club bot"}.
              {!telegramReady && " Bot token not set: tests are logged to the server console."}
            </span>
            <div className={styles.stackTight}>
              <input
                className={`${styles.inp} ${styles.inpSmall}`}
                inputMode="numeric"
                placeholder="Telegram user ID"
                aria-label="Telegram user ID"
                value={tgId}
                onChange={(e) => setTgId(e.target.value)}
              />
              <button type="button" className={styles.pill} disabled={busy || !tgId.trim()} onClick={sendTest}>
                Save and Send Test
              </button>
            </div>
            <span className={styles.hint}>User IDs are available from @userinfobot on Telegram.</span>
          </div>

          <div className={styles.panelTight}>
            <span className={styles.legend} style={{ padding: 0 }}>
              Cover Image
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
                <span className={styles.coverTitle}>{ed.coverImage ? "Replace Image" : "Upload Image"}</span>
                <span className={styles.hint}>16:9. Used for the Telegram post and link previews.</span>
              </span>
            </button>
            {ed.coverImage && (
              <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} style={{ alignSelf: "flex-start" }} onClick={() => setEd((s) => ({ ...s, coverImage: "" }))}>
                Remove Image
              </button>
            )}
          </div>

          {!published && (
            <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} style={{ alignSelf: "flex-start" }} onClick={remove}>
              Delete Issue
            </button>
          )}
        </aside>
      </div>
      {uploader.cropper}
      {node}
    </>
  );
}
