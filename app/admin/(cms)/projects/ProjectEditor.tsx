"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HighlightCard, Project, TeamMember } from "@/app/Projects/data/types";
import { CARD_ICONS } from "@/app/Projects/data/cardIcons";
import ProjectCover from "@/app/components/cms/ProjectCover";
import Medal from "@/app/components/cms/Medal";
import {
  BUILT_WITH,
  MADE_FOR,
  PROGRAMMES,
  PROJECT_STATUS_LABEL,
  type Programme,
  type Role,
} from "@/app/lib/cms/taxonomy";
import { deleteProjectAction, saveProjectAction, setWinnerAction, type SaveIntent } from "../../actions";
import { StatusChip, useActionToast, useImageUpload } from "../../_components/ui";
import styles from "../../cms.module.css";

export interface CohortOption {
  id: string;
  name: string;
  programme: Programme;
}
export interface TrackOption {
  id: number;
  name: string;
  cohortId: string;
}

interface Props {
  project: Project | null;
  cohorts: CohortOption[];
  tracks: TrackOption[];
  role: Role;
  ownTrackId: number | null;
}

const COVER_CROP = { ratio: 16 / 10, label: "16:10 · card cover" };
const SHOT_CROP = { ratio: 16 / 9, label: "16:9 · screenshot" };
const AVATAR_CROP = { ratio: 1, label: "1:1 · avatar" };

function initialForm(p: Project | null, role: Role, ownTrackId: number | null, tracks: TrackOption[]) {
  const ownTrack = tracks.find((t) => t.id === ownTrackId);
  return {
    title: p?.title ?? "",
    description: p?.description ?? "",
    programme: (p?.badge ?? (role === "dap_editor" ? "DAP" : "AI Lodge")) as Programme,
    cohortId: p?.cohortId ?? (role === "lodge_head" ? ownTrack?.cohortId ?? "" : ""),
    trackId: p?.trackId ?? (role === "lodge_head" ? ownTrackId : null),
    madeFor: p?.madeFor ?? "",
    builtWith: p?.builtWith ?? "",
    liveUrl: p?.liveUrl || p?.demoUrl || "",
    sourceUrl: p?.sourceUrl ?? "",
    coverImage: p?.coverImage ?? "",
    images: p?.images ?? [],
    overview: [p?.overview, p?.rationale].map((s) => s?.trim()).filter(Boolean).join("\n\n"),
    cards: (p?.cards ?? []) as HighlightCard[],
    team: (p?.team ?? []) as TeamMember[],
    techStack: (p?.techStack ?? []).join(", "),
  };
}

export default function ProjectEditor({ project, cohorts, tracks, role, ownTrackId }: Props) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const cover = useImageUpload("projects");
  const team = useImageUpload("team");
  const [f, setF] = useState(() => initialForm(project, role, ownTrackId, tracks));
  const [saving, setSaving] = useState(false);
  const [winner, setWinner] = useState(Boolean(project?.winner));
  const isExco = role === "exco";
  const locked = role !== "exco"; // programme / cohort / track are fixed for non-exco
  const status = project?.status ?? "draft";
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((s) => ({ ...s, [key]: value }));

  const cohortOptions = cohorts.filter((c) => c.programme === f.programme);
  const trackOptions = tracks.filter((t) => t.cohortId === f.cohortId);
  const trackName = useMemo(() => tracks.find((t) => t.id === f.trackId)?.name, [tracks, f.trackId]);

  async function upload(fn: () => Promise<string | null>) {
    try {
      return await fn();
    } catch (e) {
      show(e instanceof Error ? e.message : "Upload failed", true);
      return null;
    }
  }

  async function save(intent: SaveIntent) {
    setSaving(true);
    const res = await saveProjectAction(
      project?.slug ?? null,
      {
        title: f.title,
        description: f.description,
        programme: f.programme,
        cohortId: f.cohortId || null,
        trackId: f.trackId,
        madeFor: f.madeFor,
        builtWith: f.builtWith,
        liveUrl: f.liveUrl,
        sourceUrl: f.sourceUrl,
        demoUrl: "",
        coverImage: f.coverImage,
        images: f.images,
        overview: f.overview,
        cards: f.cards,
        team: f.team,
        techStack: f.techStack.split(","),
      },
      intent
    );
    setSaving(false);
    const messages: Record<SaveIntent, string> = {
      draft: "Draft saved",
      submit: "Submitted for review",
      publish: "Published",
      keep: "Changes saved",
    };
    const data = handle(res, messages[intent]);
    if (!data) return;
    if (!project || data.slug !== project.slug) router.replace(`/admin/projects/${data.slug}`);
    router.refresh();
  }

  async function toggleWinner(next: boolean) {
    if (!project) return;
    const ok = handle(await setWinnerAction(project.slug, next), next ? `${project.title} is the ${trackName ?? "track"} winner` : "Winner removed");
    if (ok !== undefined) {
      setWinner(next);
      router.refresh();
    }
  }

  async function remove() {
    if (!project || !confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    const ok = handle(await deleteProjectAction(project.slug));
    if (ok !== undefined) {
      router.push("/admin/projects");
      router.refresh();
    }
  }

  const primary: { label: string; intent: SaveIntent } = !isExco
    ? { label: status === "in_review" ? "Save and keep in review" : "Submit for review", intent: "submit" }
    : status === "published"
      ? { label: "Save changes", intent: "keep" }
      : { label: "Publish", intent: "publish" };
  const secondary =
    isExco && status === "published" ? "Move to draft" : !isExco && status === "published" ? null : "Save as draft";
  const help = !isExco
    ? status === "published"
      ? "This project is live. Your edits go live when you save."
      : "An exco admin approves it before it appears on the site."
    : status === "published"
      ? "Changes go live on Projects straight away."
      : "Publishing makes it visible on Projects straight away.";
  const cantSave = saving || !f.title.trim();

  return (
    <>
      <Link href="/admin/projects" className={styles.pill}>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All projects
      </Link>
      <h1 className={styles.h1} style={{ marginTop: 16 }}>
        {project ? "Edit project" : "New project"}
      </h1>

      <div className={styles.cols}>
        <section className={`${styles.colMain} ${styles.panel}`}>
          <label className={styles.fld}>
            Project name
            <input className={styles.inp} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. ScamSense" />
          </label>
          <label className={styles.fld}>
            Card description
            <textarea
              className={styles.inp}
              rows={3}
              maxLength={Math.max(200, f.description.length)}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="One or two sentences shown on cards"
            />
            <span className={styles.hint} style={{ color: f.description.length > 200 ? "#b42318" : undefined }}>
              {f.description.length} / 200 characters
            </span>
          </label>

          <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label className={styles.fld}>
              Programme
              <select
                className={styles.inp}
                value={f.programme}
                disabled={locked}
                onChange={(e) => setF((s) => ({ ...s, programme: e.target.value as Programme, cohortId: "", trackId: null }))}
              >
                {PROGRAMMES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className={styles.fld}>
              {f.programme === "AI Lodge" ? "Semester" : "Cohort"}
              <select
                className={styles.inp}
                value={f.cohortId}
                disabled={locked}
                onChange={(e) => setF((s) => ({ ...s, cohortId: e.target.value, trackId: null }))}
              >
                <option value="">Not set</option>
                {cohortOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {f.programme === "AI Lodge" && (
              <label className={styles.fld}>
                Track
                <select
                  className={styles.inp}
                  value={f.trackId ?? ""}
                  disabled={locked || trackOptions.length === 0}
                  onChange={(e) => set("trackId", e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{trackOptions.length ? "Not set" : "No tracks yet"}</option>
                  {trackOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className={styles.fld}>
              Made for
              <select className={styles.inp} value={f.madeFor} onChange={(e) => set("madeFor", e.target.value)}>
                <option value="">Not set</option>
                {MADE_FOR.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className={styles.fld}>
              Built with
              <select className={styles.inp} value={f.builtWith} onChange={(e) => set("builtWith", e.target.value)}>
                <option value="">Not set</option>
                {BUILT_WITH.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label className={styles.fld}>
              Live demo URL
              <input className={styles.inp} type="url" value={f.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://…vercel.app" />
            </label>
            <label className={styles.fld}>
              GitHub URL
              <input className={styles.inp} type="url" value={f.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://github.com/smubia-projects/…" />
            </label>
          </div>

          <div className={styles.fld}>
            Cover image
            <button
              type="button"
              className={styles.coverPick}
              disabled={cover.busy}
              onClick={async () => {
                const url = await upload(() => cover.pick(COVER_CROP));
                if (url) set("coverImage", url);
              }}
            >
              <span className={styles.coverThumb}>
                <ProjectCover title={f.title || "New"} src={f.coverImage} aspect="16 / 10" monoSize={16} sizes="72px" />
              </span>
              <span className={styles.coverText}>
                <span className={styles.coverTitle}>
                  {cover.busy ? "Uploading…" : f.coverImage ? "Replace cover image" : "Upload a cover image"}
                </span>
                <span className={styles.hint}>{f.coverImage ? "Stored in Vercel Blob · click to replace" : "16:10, shown on cards and yearbook shelves"}</span>
              </span>
            </button>
            {f.coverImage && (
              <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} style={{ alignSelf: "flex-start" }} onClick={() => set("coverImage", "")}>
                Remove cover
              </button>
            )}
          </div>

          <div className={styles.fld}>
            Screenshots
            <span className={styles.hint}>16:9 images for the carousel on the project page. The first one leads.</span>
            <div className={styles.imageStrip}>
              {f.images.map((src, i) => (
                <div key={src + i} className={styles.imageItem}>
                  <Image src={src} alt="" width={128} height={72} style={{ objectFit: "cover", display: "block" }} />
                  <button type="button" className={styles.imageRemove} aria-label={`Remove screenshot ${i + 1}`} onClick={() => set("images", f.images.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.add}
                disabled={cover.busy}
                onClick={async () => {
                  const url = await upload(() => cover.pick(SHOT_CROP));
                  if (url) set("images", [...f.images, url]);
                }}
              >
                + Screenshot
              </button>
            </div>
          </div>

          <label className={styles.fld}>
            Full write-up
            <textarea className={styles.inp} rows={8} value={f.overview} onChange={(e) => set("overview", e.target.value)} placeholder="The problem, how it was built, what the team learned" />
            <span className={styles.hint}>Markdown supported. Shown as &ldquo;How it works&rdquo; on the project page.</span>
          </label>

          <div className={styles.fld}>
            Highlight cards
            <span className={styles.hint}>Optional short cards under the write-up, e.g. a key result or takeaway.</span>
            {f.cards.map((c, i) => (
              <div key={i} className={styles.subItem}>
                <div className={styles.row}>
                  <select
                    className={`${styles.inp} ${styles.inpSmall}`}
                    style={{ width: 150 }}
                    value={c.icon}
                    aria-label="Card icon"
                    onChange={(e) => set("cards", f.cards.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
                  >
                    {CARD_ICONS.map((ic) => (
                      <option key={ic.key} value={ic.key}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={`${styles.inp} ${styles.inpSmall}`}
                    style={{ flex: 1, width: "auto" }}
                    value={c.title}
                    placeholder="Heading"
                    aria-label="Card heading"
                    onChange={(e) => set("cards", f.cards.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  />
                  <button type="button" className={styles.ico} aria-label="Remove card" onClick={() => set("cards", f.cards.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </div>
                <textarea
                  className={styles.inp}
                  rows={2}
                  value={c.body}
                  placeholder="Body (Markdown)"
                  aria-label="Card body"
                  onChange={(e) => set("cards", f.cards.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))}
                />
              </div>
            ))}
            <button type="button" className={styles.add} style={{ alignSelf: "flex-start" }} onClick={() => set("cards", [...f.cards, { icon: "lightbulb", title: "", body: "" }])}>
              + Highlight card
            </button>
          </div>

          <div className={styles.fld}>
            Team members
            {f.team.map((m, i) => {
              const patch = (p: Partial<TeamMember>) => set("team", f.team.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={i} className={styles.subItem}>
                  <div className={styles.row}>
                    <button
                      type="button"
                      className={styles.ico}
                      style={{ width: 42, height: 42, borderRadius: 999, overflow: "hidden", position: "relative" }}
                      aria-label={m.avatar ? "Replace photo" : "Add photo"}
                      onClick={async () => {
                        const url = await upload(() => team.pick(AVATAR_CROP));
                        if (url) patch({ avatar: url });
                      }}
                    >
                      {m.avatar ? <Image src={m.avatar} alt="" fill sizes="42px" style={{ objectFit: "cover" }} /> : "+"}
                    </button>
                    <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 160px", width: "auto" }} value={m.name} placeholder="Name" aria-label="Name" onChange={(e) => patch({ name: e.target.value })} />
                    <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 160px", width: "auto" }} value={m.role} placeholder="Role, e.g. ML engineer" aria-label="Role" onChange={(e) => patch({ role: e.target.value })} />
                    <button type="button" className={styles.ico} aria-label="Remove member" onClick={() => set("team", f.team.filter((_, j) => j !== i))}>
                      ×
                    </button>
                  </div>
                  <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={m.linkedin ?? ""} placeholder="LinkedIn URL" aria-label="LinkedIn URL" onChange={(e) => patch({ linkedin: e.target.value })} />
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={m.github ?? ""} placeholder="GitHub URL" aria-label="GitHub URL" onChange={(e) => patch({ github: e.target.value })} />
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={m.website ?? ""} placeholder="Website URL" aria-label="Website URL" onChange={(e) => patch({ website: e.target.value })} />
                  </div>
                </div>
              );
            })}
            <button type="button" className={styles.add} style={{ alignSelf: "flex-start" }} onClick={() => set("team", [...f.team, { name: "", role: "", avatar: "" }])}>
              + Team member
            </button>
          </div>

          <label className={styles.fld}>
            Tech stack
            <input className={styles.inp} value={f.techStack} onChange={(e) => set("techStack", e.target.value)} placeholder="Next.js, FastAPI, OpenRouter" />
            <span className={styles.hint}>Comma separated.</span>
          </label>
        </section>

        <aside className={styles.colSide}>
          <div className={styles.panelTight}>
            <div className={styles.between}>
              <span className={styles.legend} style={{ padding: 0 }}>
                Status
              </span>
              <StatusChip status={status} label={PROJECT_STATUS_LABEL[status]} />
            </div>
            <button type="button" className={styles.btn} disabled={cantSave} onClick={() => save(primary.intent)}>
              {saving ? "Saving…" : primary.label}
            </button>
            {secondary && (
              <button type="button" className={styles.pill} disabled={cantSave} onClick={() => save("draft")}>
                {secondary}
              </button>
            )}
            <span className={styles.hint}>{help}</span>
          </div>

          {isExco && project && f.programme === "AI Lodge" && (
            <div className={styles.panelTight}>
              <label className={styles.radio} style={{ alignItems: "flex-start" }}>
                <input type="checkbox" checked={winner} disabled={!project.trackId} onChange={(e) => toggleWinner(e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  <span className={styles.row} style={{ fontWeight: 600 }}>
                    <Medal size={16} /> Hack Day winner
                  </span>
                  <span className={styles.hint}>
                    {project.trackId
                      ? `One winner per track. Marking this replaces the current ${project.trackName ?? "track"} winner.`
                      : "Assign a track and save first."}
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className={styles.monoLabel}>Card preview</div>
          <div className={styles.cardPreview}>
            <ProjectCover title={f.title || "New project"} src={f.coverImage} aspect="16 / 10" monoSize={40} sizes="300px" />
            <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div className={styles.row}>
                <span className={styles.blockType} style={f.programme === "DAP" ? undefined : { background: "rgba(255,201,120,0.22)", color: "#7a6600" }}>
                  {f.programme}
                </span>
                {f.builtWith && <span className={styles.hint}>{f.builtWith}</span>}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{f.title || "Project name"}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55 }}>{f.description || "Card description"}</div>
            </div>
          </div>

          {project && (
            <div className={styles.row}>
              {project.status === "published" && (
                <a className={styles.lnk} href={`/Projects/${project.slug}`} target="_blank" rel="noopener noreferrer">
                  View on site
                </a>
              )}
              {isExco && (
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={remove}>
                  Delete project
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
      {cover.cropper}
      {team.cropper}
      {node}
    </>
  );
}
