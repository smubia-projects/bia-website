"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Captain, LodgeWeek } from "@/app/lib/db/schema";
import type { Lodge } from "@/app/lib/cms/lodges";
import {
  LODGE_AMBIENTS,
  LODGE_AMBIENT_LABEL,
  LODGE_LEVELS,
  LODGE_NEON_SIGNS,
  LODGE_NEON_SIGN_LABEL,
  type LodgeAmbient,
  type LodgeNeonSign,
} from "@/app/lib/cms/taxonomy";
import { deleteLodgeAction, saveLodgeAction } from "../../actions";
import { useActionToast, useImageUpload, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

type Draft = Omit<Lodge, "id" | "cohortId" | "position" | "updatedAt" | "topics" | "cardTags" | "goals"> & {
  topics: string;
  cardTags: string;
  goals: string;
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const toDraft = (l: Lodge): Draft => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, cohortId, position, updatedAt, ...rest } = l;
  return { ...rest, topics: l.topics.join("\n"), cardTags: l.cardTags.join("\n"), goals: l.goals.join("\n") };
};

const STANDARD_TRAIL: LodgeWeek[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ label: `Week ${i + 1}`, topic: "" })),
  { label: "Recess", topic: "Lodge hack day" },
  { label: "Week 10", topic: "Hackathon finals & project exhibition" },
];
const PHOTO_CROP = { ratio: 1, label: "1:1 · photo" };

/** Black or white text, whichever reads better on the accent. */
function readableOn(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return "#fff";
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#12352C" : "#fff";
}

/** Every field the AI Lodge site shows for one lodge, with a live card preview. */
export default function LodgeEditor({
  lodge,
  cohortSlug,
  siteHref,
  canEdit,
}: {
  lodge: Lodge;
  cohortSlug: string;
  /** The lodge's page on the AI Lodge site */
  siteHref: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const art = useImageUpload("lodges");
  const photos = useImageUpload("team");
  const initial = toDraft(lodge);
  const [f, setF] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);
  useUnsavedChanges(!saving && dirty);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((s) => ({ ...s, [k]: v }));
  const back = runHref("AI Lodge", cohortSlug, "lodges");

  async function save() {
    setSaving(true);
    const ok = handle(
      await saveLodgeAction({ ...f, id: lodge.id, cohortId: lodge.cohortId, topics: lines(f.topics), cardTags: lines(f.cardTags), goals: lines(f.goals) }),
      `${f.name} saved`
    );
    setSaving(false);
    if (ok !== undefined) router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete ${lodge.name}? Its projects keep everything except the lodge link.`)) return;
    if (handle(await deleteLodgeAction(lodge.id), "Lodge deleted") !== undefined) router.push(back);
  }

  async function upload(kind: "art" | "photo", apply: (url: string) => void) {
    try {
      const url = kind === "art" ? await art.pick(null) : await photos.pick(PHOTO_CROP);
      if (url) apply(url);
    } catch (e) {
      show(e instanceof Error ? e.message : "Upload failed", true);
    }
  }

  const text = (k: keyof Draft, label: string, opts: { hint?: string; placeholder?: string; rows?: number } = {}) => (
    <label className={styles.fld}>
      {label}
      {opts.rows ? (
        <textarea className={styles.inp} rows={opts.rows} value={f[k] as string} placeholder={opts.placeholder} disabled={!canEdit} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <input className={styles.inp} value={f[k] as string} placeholder={opts.placeholder} disabled={!canEdit} onChange={(e) => set(k, e.target.value as never)} />
      )}
      {opts.hint && <span className={styles.hint}>{opts.hint}</span>}
    </label>
  );

  const imageField = (k: "logo" | "ambientImage" | "animatedArt", label: string, hint: string) => (
    <div className={styles.fld}>
      {label}
      <span className={styles.hint}>{hint}</span>
      <div className={styles.row}>
        {f[k] && (
          <span className={styles.lodgeArtThumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f[k]} alt="" />
          </span>
        )}
        {canEdit && (
          <button type="button" className={styles.pill} disabled={art.busy} onClick={() => upload("art", (url) => set(k, url))}>
            {f[k] ? "Replace" : "Upload"}
          </button>
        )}
        {f[k] && canEdit && (
          <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => set(k, "")}>
            Remove
          </button>
        )}
      </div>
    </div>
  );

  const color = (k: "accent" | "neonColor", label: string, hint: string) => (
    <label className={styles.fld}>
      {label}
      <span className={styles.row}>
        <input
          type="color"
          className={styles.colorSwatch}
          value={f[k] || f.accent}
          aria-label={`${label} picker`}
          disabled={!canEdit}
          onChange={(e) => set(k, e.target.value.toUpperCase())}
        />
        <input
          className={`${styles.inp} ${styles.inpSmall}`}
          style={{ maxWidth: 130 }}
          value={f[k]}
          placeholder={k === "neonColor" ? "Same as accent" : "#7DD7C2"}
          disabled={!canEdit}
          onChange={(e) => set(k, e.target.value)}
        />
      </span>
      <span className={styles.hint}>{hint}</span>
    </label>
  );

  const weeks = f.weeks;
  const setWeek = (i: number, p: Partial<LodgeWeek>) => set("weeks", weeks.map((w, j) => (j === i ? { ...w, ...p } : w)));
  const captains = f.captains;
  const setCaptain = (i: number, p: Partial<Captain>) => set("captains", captains.map((c, j) => (j === i ? { ...c, ...p } : c)));
  const glow = f.neonColor || f.accent;
  const tags = (lines(f.cardTags).length ? lines(f.cardTags) : lines(f.topics)).slice(0, 3);

  return (
    <>
      <div className={styles.between} style={{ flexWrap: "wrap" }}>
        <Link href={back} className={styles.pill}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All lodges
        </Link>
        <div className={styles.row}>
          <a className={styles.pill} href={siteHref} target="_blank" rel="noopener noreferrer">
            View on the AI Lodge site
          </a>
          {canEdit && (
            <button type="button" className={styles.btn} onClick={save} disabled={saving || !dirty || !f.name.trim()}>
              {saving ? "Saving…" : "Save lodge"}
            </button>
          )}
        </div>
      </div>
      <h1 className={styles.h1} style={{ marginTop: 18 }}>
        {f.name || "Untitled lodge"}
      </h1>

      <div className={styles.cols} style={{ marginTop: 18 }}>
        <div className={styles.colMain} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className={styles.panel}>
            <h2 className={styles.h2}>Basics</h2>
            <div className={styles.grid2}>
              {text("name", "Name")}
              {text("slug", "URL name", { hint: `ailodge.smubia.com/lodges/${f.slug || "…"}` })}
            </div>
            <div className={styles.grid2}>
              <label className={styles.fld}>
                Level badge
                <input className={styles.inp} list="lodge-levels" value={f.level} placeholder="Open to all" disabled={!canEdit} onChange={(e) => set("level", e.target.value)} />
                <datalist id="lodge-levels">
                  {LODGE_LEVELS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </label>
              {text("whoCanJoin", "Who can join", { placeholder: "Anyone" })}
            </div>
            {text("motto", "Motto", { placeholder: "Mostly Intelligent Together", hint: "Shown in quotes under the name. Optional." })}
            {text("tagline", "Tagline", { placeholder: "Building AI agents that plan, remember and act." })}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Applications</legend>
              <label className={styles.radio}>
                <input type="radio" name="status" checked={f.status === "open"} disabled={!canEdit} onChange={() => set("status", "open")} />
                Taking applications
              </label>
              <label className={styles.radio}>
                <input type="radio" name="status" checked={f.status === "closed"} disabled={!canEdit} onChange={() => set("status", "closed")} />
                Not taking applications (still shown)
              </label>
              <span className={styles.hint}>The AI Lodge applications switch in Site links closes every lodge at once.</span>
            </fieldset>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Who it&apos;s for</h2>
            {text("forWho", "Who this lodge is for", { rows: 3 })}
            {text("forWhoCard", "Short version for the lodge card", { hint: "Optional. The card uses the full text when empty." })}
            {text("why", "Why join", { rows: 5 })}
            <div className={styles.grid2}>
              {text("topics", "What you'll explore", { rows: 6, hint: "One topic per line." })}
              {text("goals", "Goals", { rows: 6, hint: "One per line. Optional." })}
            </div>
            {text("cardTags", "Card tags", { rows: 3, hint: "Up to three, one per line. The first three topics are used when empty." })}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>When</h2>
            <div className={styles.grid2}>
              {text("schedule", "Schedule", { placeholder: "Tue or Wed evenings · 7–10pm" })}
              {text("scheduleShort", "Short schedule for the card", { placeholder: "Tue · 7–10pm" })}
            </div>
            <div className={styles.grid2}>
              {text("sessionLength", "Session length", { placeholder: "~3 hours per session" })}
              <label className={styles.radio} style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={f.scheduleTentative} disabled={!canEdit} onChange={(e) => set("scheduleTentative", e.target.checked)} />
                Schedule is tentative
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.between}>
              <h2 className={styles.h2}>Week by week</h2>
              {canEdit && weeks.length === 0 && (
                <button type="button" className={styles.pill} onClick={() => set("weeks", STANDARD_TRAIL)}>
                  Start from the standard 10 weeks
                </button>
              )}
            </div>
            {weeks.map((w, i) => (
              <div key={i} className={styles.subItem}>
                <div className={styles.row}>
                  <input className={`${styles.inp} ${styles.inpSmall}`} style={{ maxWidth: 120 }} value={w.label} placeholder="Week 1" aria-label="Week label" disabled={!canEdit} onChange={(e) => setWeek(i, { label: e.target.value })} />
                  <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 220px", width: "auto" }} value={w.topic} placeholder="Topic" aria-label="Topic" disabled={!canEdit} onChange={(e) => setWeek(i, { topic: e.target.value })} />
                  <select className={`${styles.inp} ${styles.inpSmall}`} style={{ maxWidth: 140 }} value={w.tag ?? ""} aria-label="Attendance" disabled={!canEdit} onChange={(e) => setWeek(i, { tag: (e.target.value || undefined) as LodgeWeek["tag"] })}>
                    <option value="">No tag</option>
                    <option value="mandatory">Mandatory</option>
                    <option value="optional">Optional</option>
                  </select>
                  {canEdit && (
                    <span className={styles.trackOrder}>
                      <button type="button" className={styles.ico} aria-label="Move up" disabled={i === 0} onClick={() => set("weeks", weeks.map((x, j) => (j === i - 1 ? weeks[i] : j === i ? weeks[i - 1] : x)))}>
                        ↑
                      </button>
                      <button type="button" className={styles.ico} aria-label="Remove week" onClick={() => set("weeks", weeks.filter((_, j) => j !== i))}>
                        ×
                      </button>
                    </span>
                  )}
                </div>
                <input className={`${styles.inp} ${styles.inpSmall}`} value={w.note ?? ""} placeholder="Note (optional), e.g. highly recommended if you need guidance" aria-label="Note" disabled={!canEdit} onChange={(e) => setWeek(i, { note: e.target.value })} />
              </div>
            ))}
            {canEdit && (
              <button type="button" className={styles.add} style={{ alignSelf: "flex-start" }} onClick={() => set("weeks", [...weeks, { label: `Week ${weeks.length + 1}`, topic: "" }])}>
                + Week
              </button>
            )}
            {text("weeksNote", "Note under the trail", { placeholder: "Weekly topics are indicative and may shift to fit the lodge." })}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Captains</h2>
            <span className={styles.hint}>The lodge heads. Usually three.</span>
            {captains.map((c, i) => (
              <div key={i} className={styles.subItem}>
                <div className={styles.row}>
                  <button
                    type="button"
                    className={styles.ico}
                    style={{ width: 48, height: 48, borderRadius: 999, overflow: "hidden", position: "relative" }}
                    aria-label={c.image ? `Replace ${c.name || "this captain"}'s photo` : "Add a photo"}
                    disabled={!canEdit || photos.busy}
                    onClick={() => upload("photo", (url) => setCaptain(i, { image: url }))}
                  >
                    {c.image ? <Image src={c.image} alt="" fill sizes="48px" style={{ objectFit: "cover" }} /> : "+"}
                  </button>
                  <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 140px", width: "auto" }} value={c.name} placeholder="Name" aria-label="Captain name" disabled={!canEdit} onChange={(e) => setCaptain(i, { name: e.target.value })} />
                  <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 160px", width: "auto" }} value={c.detail} placeholder="SCIS (IS) / Year 2" aria-label="School and year" disabled={!canEdit} onChange={(e) => setCaptain(i, { detail: e.target.value })} />
                  <input className={`${styles.inp} ${styles.inpSmall}`} style={{ flex: "1 1 140px", width: "auto" }} value={c.telegram} placeholder="Telegram handle" aria-label="Telegram handle" disabled={!canEdit} onChange={(e) => setCaptain(i, { telegram: e.target.value })} />
                  {canEdit && (
                    <button type="button" className={styles.ico} aria-label={`Remove ${c.name || "this captain"}`} onClick={() => set("captains", captains.filter((_, j) => j !== i))}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canEdit && (
              <button type="button" className={styles.add} style={{ alignSelf: "flex-start" }} onClick={() => set("captains", [...captains, { name: "", detail: "", telegram: "", image: "" }])}>
                + Captain
              </button>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Art</h2>
            {imageField("logo", "Logo", "PNG, SVG or WebP on a transparent background. The AI Lodge site paints it in the glow colour.")}
            <div className={styles.grid2}>
              {color("accent", "Accent", "Badges, bullets and tints.")}
              {color("neonColor", "Glow colour", "The lit logo and neon sign. Empty uses the accent.")}
            </div>
            <div className={styles.grid2}>
              <label className={styles.fld}>
                Neon sign
                <select className={styles.inp} value={f.neonSign} disabled={!canEdit} onChange={(e) => set("neonSign", e.target.value as LodgeNeonSign)}>
                  {LODGE_NEON_SIGNS.map((n) => (
                    <option key={n} value={n}>
                      {LODGE_NEON_SIGN_LABEL[n]}
                    </option>
                  ))}
                </select>
                <span className={styles.hint}>Animated signs drawn by the AI Lodge site.</span>
              </label>
              <label className={styles.fld}>
                Drifting particles
                <select className={styles.inp} value={f.ambient} disabled={!canEdit} onChange={(e) => set("ambient", e.target.value as LodgeAmbient)}>
                  {LODGE_AMBIENTS.map((a) => (
                    <option key={a} value={a}>
                      {LODGE_AMBIENT_LABEL[a]}
                    </option>
                  ))}
                </select>
                <label className={styles.radio}>
                  <input type="checkbox" checked={f.ambientGlow} disabled={!canEdit} onChange={(e) => set("ambientGlow", e.target.checked)} />
                  Glowing halo on the particles
                </label>
              </label>
            </div>
            {imageField("ambientImage", "Custom particle", "Optional small image that drifts behind the lodge instead of the preset, e.g. a hand-drawn leaf.")}
            {imageField("animatedArt", "Animated art", "Optional animated SVG shown in the lodge's hero instead of the logo.")}
          </section>

          {canEdit && (
            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={save} disabled={saving || !dirty || !f.name.trim()}>
                {saving ? "Saving…" : "Save lodge"}
              </button>
              <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={remove}>
                Delete lodge
              </button>
            </div>
          )}
        </div>

        <aside className={styles.colSide}>
          <span className={styles.monoLabel}>Card preview</span>
          <div className={styles.lodgeCard} style={{ ["--glow" as string]: glow }}>
            <div className={styles.lodgeCardArt}>
              {f.animatedArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.animatedArt} alt="" className={styles.lodgeCardAnimated} />
              ) : f.logo ? (
                <span className={styles.lodgeCardMark} style={{ ["--mk" as string]: `url("${f.logo}")` }} />
              ) : (
                <span className={styles.lodgeCardInitial}>{f.name.charAt(0) || "?"}</span>
              )}
            </div>
            <div className={styles.lodgeCardBody}>
              <strong className={styles.lodgeCardName}>{f.name || "Lodge name"}</strong>
              <span className={styles.row} style={{ gap: 6 }}>
                {f.level && (
                  <span className={styles.lodgeBadge} style={{ background: f.accent, color: readableOn(f.accent) }}>
                    {f.level}
                  </span>
                )}
                {f.status === "closed" && <span className={styles.lodgeBadgeMuted}>Not taking applications</span>}
              </span>
              {f.tagline && <span className={styles.lodgeCardTagline}>{f.tagline}</span>}
              {(f.forWhoCard || f.forWho) && <span className={styles.hint}>{f.forWhoCard || f.forWho}</span>}
              {tags.length > 0 && (
                <span className={styles.row} style={{ gap: 6 }}>
                  {tags.map((t) => (
                    <span key={t} className={styles.lodgeTag}>
                      {t}
                    </span>
                  ))}
                </span>
              )}
              {f.scheduleShort && <span className={styles.hint}>{f.scheduleShort}</span>}
            </div>
          </div>
          <span className={styles.hint}>
            Particles: {f.ambientImage ? "custom image" : LODGE_AMBIENT_LABEL[f.ambient]}
            {f.ambientGlow ? ", glowing" : ""}. Neon sign: {LODGE_NEON_SIGN_LABEL[f.neonSign]}. The AI Lodge site draws the motion.
          </span>
        </aside>
      </div>
      {art.cropper}
      {photos.cropper}
      {node}
    </>
  );
}
