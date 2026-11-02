"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Captain, LodgeBelt, LodgeHero, LodgeWeek } from "@/app/lib/db/schema";
import type { Lodge } from "@/app/lib/cms/lodges";
import {
  LODGE_AMBIENTS,
  LODGE_AMBIENT_LABEL,
  LODGE_BELT_MODES,
  LODGE_BELT_MODE_LABEL,
  LODGE_BELT_SIZES,
  LODGE_BELT_SPEEDS,
  LODGE_EMBLEMS,
  LODGE_HERO_KINDS,
  LODGE_HERO_KIND_LABEL,
  LODGE_LEVELS,
  LODGE_LOGO_STYLES,
  LODGE_LOGO_STYLE_LABEL,
  LODGE_NEON_SIGNS,
  LODGE_NEON_SIGN_LABEL,
  LODGE_PARTICLES,
  LODGE_PARTICLES_LABEL,
  LODGE_SHOWPIECES,
  LODGE_SHOWPIECE_LABEL,
  type LodgeAmbient,
  type LodgeEmblem,
  type LodgeLogoStyle,
  type LodgeNeonSign,
} from "@/app/lib/cms/taxonomy";
import { deleteLodgeAction, saveLodgeAction } from "../../actions";
import { useActionToast, useImageUpload, useUnsavedChanges } from "../../_components/ui";
import { runHref } from "../../_components/runs";
import styles from "../../cms.module.css";

type Draft = Omit<Lodge, "id" | "cohortId" | "position" | "updatedAt" | "topics" | "cardTags" | "goals" | "oldSlugs"> & {
  topics: string;
  cardTags: string;
  goals: string;
  oldSlugs: string;
};

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const toDraft = (l: Lodge): Draft => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, cohortId, position, updatedAt, ...rest } = l;
  return { ...rest, topics: l.topics.join("\n"), cardTags: l.cardTags.join("\n"), goals: l.goals.join("\n"), oldSlugs: l.oldSlugs.join("\n") };
};

const STANDARD_TRAIL: LodgeWeek[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ label: `Week ${i + 1}`, topic: "" })),
  { label: "Recess", topic: "Lodge hack day" },
  { label: "Week 10", topic: "Hackathon finals & project exhibition" },
];
const PHOTO_CROP = { ratio: 1, label: "1:1 · photo" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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
    handle(
      await saveLodgeAction({
        ...f,
        id: lodge.id,
        cohortId: lodge.cohortId,
        topics: lines(f.topics),
        cardTags: lines(f.cardTags),
        goals: lines(f.goals),
        oldSlugs: lines(f.oldSlugs),
      }),
      `${f.name} saved`
    );
    setSaving(false);
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

  const imageField = (value: string, onChange: (url: string) => void, label: string, hint: string, wide = false) => (
    <div className={styles.fld}>
      {label}
      <span className={styles.hint}>{hint}</span>
      <div className={styles.row}>
        {value && (
          <span className={styles.lodgeArtThumb} style={wide ? { width: 220 } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" />
          </span>
        )}
        {canEdit && (
          <button type="button" className={styles.pill} disabled={art.busy} onClick={() => upload("art", onChange)}>
            {value ? "Replace" : "Upload"}
          </button>
        )}
        {value && canEdit && (
          <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => onChange("")}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
  const select = <T extends string>(label: string, value: T, options: readonly T[], labelOf: (v: T) => string, onChange: (v: T) => void, hint?: string) => (
    <label className={styles.fld}>
      {label}
      <select className={styles.inp} value={value} disabled={!canEdit} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {labelOf(o)}
          </option>
        ))}
      </select>
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
  const setHero = (p: Partial<LodgeHero>) => set("hero", { ...f.hero, ...p });
  const setBelt = (p: Partial<LodgeBelt>) => set("belt", { ...f.belt, ...p });

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
            {text("oldSlugs", "Old URL names", { rows: 2, hint: "One per line. Links to ailodge.smubia.com/lodges/<old name> redirect here, e.g. after a rename." })}
            <label className={styles.radio}>
              <input type="checkbox" checked={f.placeholder} disabled={!canEdit} onChange={(e) => set("placeholder", e.target.checked)} />
              Details not released yet
            </label>
            <span className={styles.hint}>
              The card says &quot;Reveals …&quot; with the semester&apos;s &quot;Lodge details drop&quot; text, and the lodge takes no applications until you untick this.
            </span>
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
            <label className={styles.radio}>
              <input type="checkbox" checked={f.trailTentative} disabled={!canEdit} onChange={(e) => set("trailTentative", e.target.checked)} />
              The weekly topics are a draft
            </label>
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
            <h2 className={styles.h2}>Logo and colours</h2>
            {imageField(f.logo, (url) => set("logo", url), "Logo", "PNG, SVG or WebP on a transparent background. Used on the lodge card, in the strip and in the header.")}
            <div className={styles.grid2}>
              {select("Draw the logo", f.logoStyle, LODGE_LOGO_STYLES, (v) => LODGE_LOGO_STYLE_LABEL[v], (v) => set("logoStyle", v as LodgeLogoStyle), "Painting suits one-colour logos; multi-colour art keeps its own colours.")}
              {select("Stand-in emblem", f.emblem, LODGE_EMBLEMS, cap, (v) => set("emblem", v as LodgeEmblem), "Shown while there's no logo.")}
            </div>
            <div className={styles.grid2}>
              {color("accent", "Accent", "Badges, bullets and tints.")}
              {color("neonColor", "Glow colour", "The lit logo and neon sign. Empty uses the accent.")}
            </div>
            {select(
              "Neon sign",
              f.neonSign,
              LODGE_NEON_SIGNS,
              (v) => LODGE_NEON_SIGN_LABEL[v],
              (v) => set("neonSign", v as LodgeNeonSign),
              "Animated glass-tube signs coded on the AI Lodge site. When set, it replaces the logo on the card and in the strip."
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Page header</h2>
            {select("Art beside the name", f.hero.kind, LODGE_HERO_KINDS, (v) => LODGE_HERO_KIND_LABEL[v], (kind) =>
              set("hero", kind === "showpiece" ? { kind, showpiece: f.hero.showpiece ?? "despacito" } : kind === "custom" ? { glow: "", particles: "none", float: true, ...f.hero, kind } : { ...f.hero, kind })
            )}
            {f.hero.kind === "neon" && f.neonSign === "none" && <span className={styles.hint}>Pick a neon sign under Logo and colours.</span>}
            {f.hero.kind === "showpiece" &&
              select("Showpiece", f.hero.showpiece ?? "despacito", LODGE_SHOWPIECES, (v) => LODGE_SHOWPIECE_LABEL[v], (v) => setHero({ showpiece: v }), "Layered, animated art coded on the AI Lodge site for one lodge. Any lodge can reuse one.")}
            {f.hero.kind === "custom" && (
              <>
                {imageField(f.hero.image ?? "", (url) => setHero({ image: url }), "Showpiece image", "The main lodge picture, shown in its own colours. A transparent PNG or WebP works best.")}
                <div className={styles.grid2}>
                  <label className={styles.fld}>
                    Glow behind it
                    <span className={styles.row}>
                      <input type="color" className={styles.colorSwatch} value={f.hero.glow || glow} aria-label="Glow colour picker" disabled={!canEdit} onChange={(e) => setHero({ glow: e.target.value.toUpperCase() })} />
                      <input className={`${styles.inp} ${styles.inpSmall}`} style={{ maxWidth: 130 }} value={f.hero.glow ?? ""} placeholder="No glow" disabled={!canEdit} onChange={(e) => setHero({ glow: e.target.value })} />
                    </span>
                  </label>
                  {select("Particles", f.hero.particles ?? "none", LODGE_PARTICLES, (v) => LODGE_PARTICLES_LABEL[v], (v) => setHero({ particles: v }))}
                </div>
                <label className={styles.radio}>
                  <input type="checkbox" checked={f.hero.float !== false} disabled={!canEdit} onChange={(e) => setHero({ float: e.target.checked })} />
                  Float gently and follow the pointer
                </label>
              </>
            )}
            {f.hero.kind === "animated" &&
              imageField(f.hero.image ?? "", (url) => setHero({ image: url }), "Animated SVG", "Shown in the header as uploaded, animations included.")}
            <span className={styles.hint}>The logo and neon sign also draw a faint oversized copy of the logo behind the header; showpieces bring their own backdrop.</span>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Strip under the header</h2>
            {select("Strip", f.belt.mode, LODGE_BELT_MODES, (v) => LODGE_BELT_MODE_LABEL[v], (mode) => setBelt({ mode }))}
            {f.belt.mode === "tile" &&
              imageField(f.belt.image ?? "", (url) => setBelt({ image: url }), "Image to repeat", "A small transparent image, repeated in a line in its own colours.")}
            {f.belt.mode === "banner" &&
              imageField(f.belt.image ?? "", (url) => setBelt({ image: url }), "Long strip image", "One wide image whose left and right edges join up; it scrolls in a loop. About 3000 × 160 px works well.", true)}
            {f.belt.mode !== "none" && (
              <div className={styles.grid2}>
                {select("Speed", f.belt.speed, LODGE_BELT_SPEEDS, cap, (speed) => setBelt({ speed }))}
                {select("Size", f.belt.size, LODGE_BELT_SIZES, cap, (size) => setBelt({ size }))}
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Drifting particles</h2>
            <div className={styles.grid2}>
              {select("Particles behind the page", f.ambient, LODGE_AMBIENTS, (v) => LODGE_AMBIENT_LABEL[v], (v) => set("ambient", v as LodgeAmbient))}
              <label className={styles.radio} style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={f.ambientGlow} disabled={!canEdit} onChange={(e) => set("ambientGlow", e.target.checked)} />
                Glowing halo on the particles
              </label>
            </div>
            {imageField(f.ambientImage, (url) => set("ambientImage", url), "Custom particle", "Optional small image that drifts instead of the preset, e.g. a hand-drawn leaf.")}
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
              {f.logo && f.logoStyle === "original" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.logo} alt="" className={styles.lodgeCardAnimated} />
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
            Header: {f.hero.kind === "showpiece" && f.hero.showpiece ? LODGE_SHOWPIECE_LABEL[f.hero.showpiece] : LODGE_HERO_KIND_LABEL[f.hero.kind]}. Strip:{" "}
            {LODGE_BELT_MODE_LABEL[f.belt.mode].toLowerCase()}. Neon sign: {LODGE_NEON_SIGN_LABEL[f.neonSign]}. Particles:{" "}
            {f.ambientImage ? "custom image" : LODGE_AMBIENT_LABEL[f.ambient]}
            {f.ambientGlow ? ", glowing" : ""}. The AI Lodge site draws the motion; open the lodge there to see it.
          </span>
        </aside>
      </div>
      {art.cropper}
      {photos.cropper}
      {node}
    </>
  );
}
