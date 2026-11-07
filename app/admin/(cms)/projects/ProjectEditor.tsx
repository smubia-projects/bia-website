"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { HighlightCard, Project, TeamMember } from "@/app/projects/data/types";
import { CARD_ICONS } from "@/app/projects/data/cardIcons";
import ProjectCover from "@/app/components/cms/ProjectCover";
import Medal from "@/app/components/cms/Medal";
import {
  BUILT_WITH,
  MADE_FOR,
  PROGRAMMES,
  PROJECT_STATUS_LABEL,
  ROLE_PROGRAMME,
  type Programme,
  type Role,
} from "@/app/lib/cms/taxonomy";
import { projectPath } from "@/app/lib/cms/paths";
import { deleteProjectAction, saveProjectAction, setWinnerAction, type SaveIntent } from "../../actions";
import { AddButton, ExternalAction, MarkdownHint, MiniField, OrderButtons, PageHead, StatusChip, UnsavedNote, moveItem, useActionToast, useConfirm, useImageUpload, useSaveShortcut, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

export interface CohortOption {
  id: string;
  slug: string;
  name: string;
  programme: Programme;
}
export interface TrackOption {
  id: number;
  name: string;
  cohortId: string;
}
export type LodgeOption = TrackOption;

interface Props {
  project: Project | null;
  cohorts: CohortOption[];
  tracks: TrackOption[];
  lodges: LodgeOption[];
  role: Role;
  /** New projects started from a semester's or cohort's Projects page */
  preset?: { cohortId: string; trackId: number | null } | null;
  /** Read-only: a lodge head's submitted or published project */
  locked?: boolean;
}

const COVER_CROP = { ratio: 16 / 10, label: "16:10 · card cover" };
const SHOT_CROP = { ratio: 16 / 9, label: "16:9 · screenshot" };
const AVATAR_CROP = { ratio: 1, label: "1:1 · avatar" };

function initialForm(
  p: Project | null,
  role: Role,
  cohorts: CohortOption[],
  preset: Props["preset"]
) {
  const presetCohort = cohorts.find((c) => c.id === preset?.cohortId);
  return {
    title: p?.title ?? "",
    description: p?.description ?? "",
    programme: (p?.badge ?? presetCohort?.programme ?? (ROLE_PROGRAMME[role] ?? "AI Lodge")) as Programme,
    cohortId: p?.cohortId ?? presetCohort?.id ?? "",
    trackId: p?.trackId ?? (presetCohort ? preset?.trackId ?? null : null),
    lodgeId: p?.lodgeId ?? null,
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

export default function ProjectEditor({ project, cohorts, tracks, lodges, role, preset, locked = false }: Props) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const confirm = useConfirm();
  const cover = useImageUpload("projects");
  const team = useImageUpload("team");
  const isHead = role === "lodge_head";
  const [initial] = useState(() => {
    const form = initialForm(project, role, cohorts, preset);
    // A lodge head with one lodge in the semester starts in it.
    const own = lodges.filter((l) => l.cohortId === form.cohortId);
    if (!project && isHead && own.length === 1) form.lodgeId = own[0].id;
    return form;
  });
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  useUnsavedChanges(!saving && dirty);
  const [winner, setWinner] = useState(Boolean(project?.winner));
  const isExco = role === "exco";
  const status = project?.status ?? "draft";
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => setF((s) => ({ ...s, [key]: value }));

  const placementGroups = PROGRAMMES.filter((p) => !ROLE_PROGRAMME[role] || ROLE_PROGRAMME[role] === p).map((p) => ({
    programme: p,
    label: p === "AI Lodge" ? "AI Lodge semesters" : "DAP cohorts",
    // Lodge heads always place projects in one of their lodges' semesters.
    none: isHead ? null : p === "AI Lodge" ? "AI Lodge, no semester" : "DAP, no cohort",
    cohorts: cohorts.filter((c) => c.programme === p),
  }));
  const trackOptions = tracks.filter((t) => t.cohortId === f.cohortId);
  const lodgeOptions = lodges.filter((l) => l.cohortId === f.cohortId);
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
    if (
      intent === "draft" &&
      status === "published" &&
      !(await confirm({ title: "Move to Draft", body: `"${project?.title}" is removed from the public site until it is published again.`, action: "Move to Draft" }))
    ) {
      return;
    }
    setSaving(true);
    const res = await saveProjectAction(
      project?.slug ?? null,
      {
        title: f.title,
        description: f.description,
        programme: f.programme,
        cohortId: f.cohortId || null,
        trackId: f.trackId,
        lodgeId: f.lodgeId,
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
      publish: "Project published",
      keep: "Changes saved",
    };
    const data = handle(res, messages[intent]);
    if (!data) return;
    if (!project || data.slug !== project.slug) router.replace(`/admin/projects/${data.slug}`);
  }

  async function toggleWinner(next: boolean) {
    if (!project) return;
    const ok = handle(await setWinnerAction(project.slug, next), next ? `${project.title} set as ${trackName ?? "track"} winner` : "Winner removed");
    if (ok !== undefined) {
      setWinner(next);
    }
  }

  async function remove() {
    if (!project) return;
    const yes = await confirm({ title: "Delete Project", body: `"${project.title}" is permanently deleted. This cannot be undone.`, action: "Delete Project", danger: true });
    if (!yes) return;
    const ok = handle(await deleteProjectAction(project.slug), "Project deleted");
    if (ok !== undefined) {
      router.push("/admin/projects");
    }
  }

  const primary: { label: string; intent: SaveIntent } = !isExco
    ? { label: status === "in_review" ? "Save Changes" : "Submit for Review", intent: "submit" }
    : status === "published"
      ? { label: "Save Changes", intent: "keep" }
      : { label: "Publish", intent: "publish" };
  const secondary =
    isExco && status === "published" ? "Move to Draft" : !isExco && status === "published" ? null : "Save as Draft";
  const help = isHead
    ? "Submitting locks the project for review. AI Lodge exco can return it to draft for changes."
    : !isExco
      ? status === "published"
        ? "Published. Saved changes apply to the public page immediately."
        : "Publishing requires exco admin approval."
      : status === "published"
        ? "Published. Saved changes apply to the public page immediately."
        : "Publishing adds the project to the public site immediately.";
  const lockedNote =
    status === "published"
      ? "Published. Ask AI Lodge exco for changes."
      : "Submitted for review. Locked until AI Lodge exco approves it or returns it to draft.";
  const cantSave = locked || saving || !f.title.trim() || (isHead && !f.lodgeId);
  const needsCohort = (primary.intent === "publish" || status === "published") && !f.cohortId;
  // Saves without changing status: Ctrl+S never publishes or submits.
  useSaveShortcut(() => save(project ? "keep" : "draft"), dirty && !cantSave && !(status === "published" && !f.cohortId));

  return (
    <>
      <PageHead crumbs={[{ href: "/admin/projects", label: "All Projects" }]} title={project ? project.title : "New Project"} />

      <div className={styles.cols}>
        <fieldset disabled={locked} className={`${styles.colMain} ${styles.stack}`} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <section className={styles.panel}>
            <h2 className={styles.h2}>Project Details</h2>
            <label className={styles.fld}>
              Project Name
              <input className={styles.inp} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="ScamSense" />
            </label>
            <label className={styles.fld}>
              Card Description
              <textarea
                className={styles.inp}
                rows={3}
                maxLength={Math.max(200, f.description.length)}
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <span className={styles.hint} style={{ color: f.description.length > 200 ? "var(--danger)" : undefined }}>
                {f.description.length} / 200 characters. Shown on project cards.
              </span>
            </label>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Placement</h2>
            <label className={styles.fld}>
              Semester / Cohort
              <select
                className={styles.inp}
                value={`${f.programme}|${f.cohortId}`}
                onChange={(e) => {
                  const [programme, cohortId] = e.target.value.split("|");
                  setF((s) => ({ ...s, programme: programme as Programme, cohortId, trackId: null, lodgeId: null }));
                }}
              >
                {placementGroups.map((g) => (
                  <optgroup key={g.programme} label={g.label}>
                    {g.cohorts.map((c) => (
                      <option key={c.id} value={`${g.programme}|${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                    {g.none && <option value={`${g.programme}|`}>{g.none}</option>}
                  </optgroup>
                ))}
              </select>
              <span className={styles.hint}>
                {f.cohortId ? (
                  <>
                    Sets the project&apos;s public URL.{" "}
                    {!isHead && <Link
                      className={`${styles.lnk} ${styles.lnkInline}`}
                      href={runHref(f.programme, cohorts.find((c) => c.id === f.cohortId)?.slug ?? "", "projects")}
                    >
                      Open {f.programme === "AI Lodge" ? "Semester" : "Cohort"} Projects
                    </Link>}
                  </>
                ) : (
                  "Required before publishing."
                )}
              </span>
            </label>
            {f.programme === "AI Lodge" && (
              <div className={styles.grid2}>
                <label className={styles.fld}>
                  Hack Day Track
                  <select
                    className={styles.inp}
                    value={f.trackId ?? ""}
                    disabled={trackOptions.length === 0}
                    onChange={(e) => set("trackId", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{trackOptions.length ? "Not set" : "No tracks in this semester"}</option>
                    {trackOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.fld}>
                  Lodge
                  <select
                    className={styles.inp}
                    value={f.lodgeId ?? ""}
                    disabled={lodgeOptions.length === 0}
                    onChange={(e) => set("lodgeId", e.target.value ? Number(e.target.value) : null)}
                  >
                    {(!isHead || !f.lodgeId) && <option value="">{lodgeOptions.length ? (isHead ? "Choose your lodge" : "Not set") : "No lodges in this semester"}</option>}
                    {lodgeOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Classification</h2>
            <div className={styles.grid2}>
              <label className={styles.fld}>
                Made For
                <select className={styles.inp} value={f.madeFor} onChange={(e) => set("madeFor", e.target.value)}>
                  <option value="">Not set</option>
                  {MADE_FOR.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className={styles.fld}>
                Built With
                <select className={styles.inp} value={f.builtWith} onChange={(e) => set("builtWith", e.target.value)}>
                  <option value="">Not set</option>
                  {BUILT_WITH.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className={styles.fld}>
              Tech Stack
              <input className={styles.inp} value={f.techStack} onChange={(e) => set("techStack", e.target.value)} placeholder="Next.js, FastAPI, OpenRouter" />
              <span className={styles.hint}>Comma-separated.</span>
            </label>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Links</h2>
            <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <label className={styles.fld}>
                Live Demo URL
                <input className={styles.inp} type="url" value={f.liveUrl} onChange={(e) => set("liveUrl", e.target.value)} placeholder="https://" />
              </label>
              <label className={styles.fld}>
                GitHub URL
                <input className={styles.inp} type="url" value={f.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://github.com/smubia-projects/" />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Images</h2>
            <div className={styles.fld}>
              Cover Image
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
                  <span className={styles.coverTitle}>{cover.busy ? "Uploading…" : f.coverImage ? "Replace Cover Image" : "Upload Cover Image"}</span>
                  <span className={styles.hint}>16:10. Shown on cards and yearbook shelves.</span>
                </span>
              </button>
              {f.coverImage && (
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} style={{ alignSelf: "flex-start" }} onClick={() => set("coverImage", "")}>
                  Remove Cover Image
                </button>
              )}
            </div>

            <div className={styles.fld}>
              Screenshots
              <span className={styles.hint}>16:9. Project page carousel, in this order.</span>
              <div className={styles.imageStrip}>
                {f.images.map((src, i) => (
                  <div key={src + i} className={styles.imageItem}>
                    <Image src={src} alt="" width={128} height={72} style={{ objectFit: "cover", display: "block" }} />
                    <button type="button" className={styles.imageRemove} aria-label={`Remove screenshot ${i + 1}`} title="Remove" onClick={() => set("images", f.images.filter((_, j) => j !== i))}>
                      <X size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                    <span className={styles.imageOrder}>
                      <button type="button" className={styles.ico} aria-label={`Move screenshot ${i + 1} earlier`} title="Move Earlier" disabled={i === 0} onClick={() => set("images", moveItem(f.images, i, -1))}>
                        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button type="button" className={styles.ico} aria-label={`Move screenshot ${i + 1} later`} title="Move Later" disabled={i === f.images.length - 1} onClick={() => set("images", moveItem(f.images, i, 1))}>
                        <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                ))}
                <AddButton
                  label="Add Screenshot"
                  disabled={cover.busy}
                  onClick={async () => {
                    const url = await upload(() => cover.pick(SHOT_CROP));
                    if (url) set("images", [...f.images, url]);
                  }}
                />
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Write-Up</h2>
            <div className={styles.fld}>
              <textarea className={styles.inp} rows={8} aria-label="Write-up" value={f.overview} onChange={(e) => set("overview", e.target.value)} placeholder="Problem, approach and outcome" />
              <MarkdownHint>Shown as &ldquo;Project details&rdquo; on the project page.</MarkdownHint>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionHead}>
              <h2 className={styles.h2}>Highlight Cards</h2>
              <p className={styles.sectionHint}>Optional. Shown under the write-up, for example a key result.</p>
            </div>
              {f.cards.map((c, i) => (
                <div key={i} className={styles.subItem}>
                  <div className={styles.rowEnd}>
                    <MiniField label="Icon" grow={0}>
                      <select
                        className={`${styles.inp} ${styles.inpSmall}`}
                        style={{ width: 150 }}
                        value={c.icon}
                        onChange={(e) => set("cards", f.cards.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
                      >
                        {CARD_ICONS.map((ic) => (
                          <option key={ic.key} value={ic.key}>
                            {ic.label}
                          </option>
                        ))}
                      </select>
                    </MiniField>
                    <MiniField label="Heading">
                      <input className={`${styles.inp} ${styles.inpSmall}`} value={c.title} onChange={(e) => set("cards", f.cards.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    </MiniField>
                    <OrderButtons index={i} count={f.cards.length} label={c.title || `card ${i + 1}`} onMove={(dir) => set("cards", moveItem(f.cards, i, dir))} />
                    <button type="button" className={styles.ico} aria-label={`Remove card ${c.title || i + 1}`} title="Remove" onClick={() => set("cards", f.cards.filter((_, j) => j !== i))}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                  <MiniField label="Body (Markdown)">
                    <textarea className={styles.inp} rows={2} value={c.body} onChange={(e) => set("cards", f.cards.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
                  </MiniField>
                </div>
              ))}
              <AddButton label="Add Highlight Card" onClick={() => set("cards", [...f.cards, { icon: "lightbulb", title: "", body: "" }])} />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Team Members</h2>
            {f.team.map((m, i) => {
              const patch = (p: Partial<TeamMember>) => set("team", f.team.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={i} className={styles.subItem}>
                  <div className={styles.rowEnd}>
                    <button
                      type="button"
                      className={styles.avatarBtn}
                      aria-label={m.avatar ? `Replace photo of ${m.name || "team member"}` : `Add photo of ${m.name || "team member"}`}
                      title={m.avatar ? "Replace Photo" : "Add Photo"}
                      onClick={async () => {
                        const url = await upload(() => team.pick(AVATAR_CROP));
                        if (url) patch({ avatar: url });
                      }}
                    >
                      {m.avatar ? <Image src={m.avatar} alt="" fill sizes="42px" style={{ objectFit: "cover" }} /> : <Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
                    </button>
                    <MiniField label="Name">
                      <input className={`${styles.inp} ${styles.inpSmall}`} value={m.name} onChange={(e) => patch({ name: e.target.value })} />
                    </MiniField>
                    <MiniField label="Role">
                      <input className={`${styles.inp} ${styles.inpSmall}`} value={m.role} onChange={(e) => patch({ role: e.target.value })} />
                    </MiniField>
                    <OrderButtons index={i} count={f.team.length} label={m.name || "team member"} onMove={(dir) => set("team", moveItem(f.team, i, dir))} />
                    <button type="button" className={styles.ico} aria-label={`Remove ${m.name || "team member"}`} title="Remove" onClick={() => set("team", f.team.filter((_, j) => j !== i))}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles.grid2} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                    <MiniField label="LinkedIn URL">
                      <input className={`${styles.inp} ${styles.inpSmall}`} type="url" value={m.linkedin ?? ""} onChange={(e) => patch({ linkedin: e.target.value })} />
                    </MiniField>
                    <MiniField label="GitHub URL">
                      <input className={`${styles.inp} ${styles.inpSmall}`} type="url" value={m.github ?? ""} onChange={(e) => patch({ github: e.target.value })} />
                    </MiniField>
                    <MiniField label="Website URL">
                      <input className={`${styles.inp} ${styles.inpSmall}`} type="url" value={m.website ?? ""} onChange={(e) => patch({ website: e.target.value })} />
                    </MiniField>
                  </div>
                </div>
              );
            })}
            <AddButton label="Add Team Member" onClick={() => set("team", [...f.team, { name: "", role: "", avatar: "" }])} />
          </section>
        </fieldset>

        <aside className={styles.colSide}>
          <div className={styles.panelTight}>
            <div className={styles.between}>
              <span className={styles.legend} style={{ padding: 0 }}>
                Status
              </span>
              <StatusChip status={status} label={PROJECT_STATUS_LABEL[status]} />
            </div>
            {locked ? (
              <span className={styles.hint}>{lockedNote}</span>
            ) : (
              <>
            <UnsavedNote show={dirty} onDiscard={() => setF(initial)} />
            <button type="button" className={styles.btn} disabled={cantSave || needsCohort} onClick={() => save(primary.intent)}>
              {saving ? "Saving…" : primary.label}
            </button>
            {isExco && status !== "published" && (
              <button
                type="button"
                className={styles.pill}
                disabled={cantSave}
                onClick={() => save(status === "in_review" ? "keep" : "submit")}
              >
                {status === "in_review" ? "Save in Review" : "Mark as In Review"}
              </button>
            )}
            {secondary && (
              <button type="button" className={styles.pill} disabled={cantSave} onClick={() => save("draft")}>
                {secondary}
              </button>
            )}
            <span className={styles.hint}>
              {needsCohort ? "Semester or cohort required before publishing." : isHead && !f.lodgeId ? "Choose your lodge under Placement." : help}
            </span>
              </>
            )}
          </div>

          {isExco && project && f.programme === "AI Lodge" && (
            <div className={styles.panelTight}>
              <label className={styles.radio} style={{ alignItems: "flex-start" }}>
                <input type="checkbox" checked={winner} disabled={!project.trackId} onChange={(e) => toggleWinner(e.target.checked)} style={{ marginTop: 2 }} />
                <span>
                  <span className={styles.row} style={{ fontWeight: 600 }}>
                    <Medal size={16} /> Hack Day Winner
                  </span>
                  <span className={styles.hint}>
                    {project.trackId
                      ? `Saves immediately. One winner per track: replaces the current ${project.trackName ?? "track"} winner.`
                      : "Requires a saved Hack Day track."}
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className={styles.monoLabel}>Card Preview</div>
          <div className={styles.cardPreview}>
            <ProjectCover title={f.title || "New project"} src={f.coverImage} aspect="16 / 10" monoSize={40} sizes="300px" />
            <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div className={styles.row}>
                <span className={styles.blockType} style={f.programme === "DAP" ? undefined : { background: "rgba(233,196,0,0.18)", color: "var(--gold-deep)" }}>
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
              <ExternalAction quiet href={`/admin/preview/project/${project.slug}`} label="Preview" />
              {project.status === "published" && <ExternalAction quiet href={projectPath(project)} label="View Public Page" />}
              {isExco && (
                <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={remove}>
                  Delete Project
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
