"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
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
import { AddButton, ExternalAction, MiniField, OrderButtons, PageHead, UnsavedNote, moveItem, useActionToast, useConfirm, useImageUpload, useSaveShortcut, useUnsavedChanges } from "../../_components/ui";
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
  const confirm = useConfirm();
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

  useSaveShortcut(save, canEdit && dirty && !saving && Boolean(f.name.trim()));

  async function remove() {
    if (!(await confirm({ title: "Delete Lodge", body: `${lodge.name} is deleted. Its projects stay, without a lodge.`, action: "Delete Lodge", danger: true }))) return;
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
            {value ? "Replace Image" : "Upload Image"}
          </button>
        )}
        {value && canEdit && (
          <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={() => onChange("")}>
            Remove Image
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
      <PageHead crumbs={[{ href: back, label: "Lodges" }]} title={lodge.name} />

      <div className={styles.cols} style={{ marginTop: 18 }}>
        <div className={styles.colMain} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className={styles.panel}>
            <h2 className={styles.h2}>Basics</h2>
            <div className={styles.grid2}>
              {text("name", "Name")}
              {text("slug", "URL Slug", { hint: `ailodge.smubia.com/lodges/${f.slug || "…"}` })}
            </div>
            {text("oldSlugs", "Previous URL Slugs", { rows: 2, hint: "One per line. These addresses redirect to this lodge." })}
            <label className={styles.radio}>
              <input type="checkbox" checked={f.placeholder} disabled={!canEdit} onChange={(e) => set("placeholder", e.target.checked)} />
              Details Not Released
            </label>
            <span className={styles.hint}>
              The card shows the semester&apos;s Lodge Details Release text. Applications stay closed while this is set.
            </span>
            <div className={styles.grid2}>
              <label className={styles.fld}>
                Level Badge
                <input className={styles.inp} list="lodge-levels" value={f.level} placeholder="Open to all" disabled={!canEdit} onChange={(e) => set("level", e.target.value)} />
                <datalist id="lodge-levels">
                  {LODGE_LEVELS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </label>
              {text("whoCanJoin", "Eligibility", { placeholder: "Anyone" })}
            </div>
            {text("motto", "Motto", { placeholder: "Mostly Intelligent Together", hint: "Optional. Shown in quotes under the name." })}
            {text("tagline", "Tagline", { placeholder: "Building AI agents that plan, remember and act." })}
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Applications</legend>
              <label className={styles.radio}>
                <input type="radio" name="status" checked={f.status === "open"} disabled={!canEdit} onChange={() => set("status", "open")} />
                Open
              </label>
              <label className={styles.radio}>
                <input type="radio" name="status" checked={f.status === "closed"} disabled={!canEdit} onChange={() => set("status", "closed")} />
                Closed (lodge remains listed)
              </label>
              <span className={styles.hint}>The AI Lodge switch in Site Links closes all lodges.</span>
            </fieldset>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Audience and Content</h2>
            {text("forWho", "Target Audience", { rows: 3 })}
            {text("forWhoCard", "Target Audience (Card)", { hint: "Optional. Empty uses the full text." })}
            {text("why", "Join Rationale", { rows: 5, hint: "Shown as “Why join” on the lodge page." })}
            <div className={styles.grid2}>
              {text("topics", "Topics", { rows: 6, hint: "One per line. Shown as “What you'll explore”." })}
              {text("goals", "Goals", { rows: 6, hint: "One per line. Optional." })}
            </div>
            {text("cardTags", "Card Tags", { rows: 3, hint: "Up to three, one per line. Empty uses the first three topics." })}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Schedule</h2>
            <div className={styles.grid2}>
              {text("schedule", "Meeting Time", { placeholder: "Tue or Wed evenings · 7–10pm" })}
              {text("scheduleShort", "Meeting Time (Card)", { placeholder: "Tue · 7–10pm" })}
            </div>
            <div className={styles.grid2}>
              {text("sessionLength", "Session Length", { placeholder: "~3 hours per session" })}
              <label className={styles.radio} style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={f.scheduleTentative} disabled={!canEdit} onChange={(e) => set("scheduleTentative", e.target.checked)} />
                Meeting Time Tentative
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.between}>
              <h2 className={styles.h2}>Weekly Trail</h2>
              {canEdit && weeks.length === 0 && (
                <button type="button" className={styles.pill} onClick={() => set("weeks", STANDARD_TRAIL)}>
                  Insert 10-Week Template
                </button>
              )}
            </div>
            {weeks.map((w, i) => (
              <div key={i} className={styles.subItem}>
                <div className={styles.rowEnd}>
                  <MiniField label="Label" grow={0}>
                    <input className={`${styles.inp} ${styles.inpSmall}`} style={{ width: 110 }} value={w.label} disabled={!canEdit} onChange={(e) => setWeek(i, { label: e.target.value })} />
                  </MiniField>
                  <MiniField label="Topic" grow={3}>
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={w.topic} disabled={!canEdit} onChange={(e) => setWeek(i, { topic: e.target.value })} />
                  </MiniField>
                  <MiniField label="Attendance" grow={0}>
                    <select className={`${styles.inp} ${styles.inpSmall}`} style={{ width: 130 }} value={w.tag ?? ""} disabled={!canEdit} onChange={(e) => setWeek(i, { tag: (e.target.value || undefined) as LodgeWeek["tag"] })}>
                      <option value="">Not set</option>
                      <option value="mandatory">Mandatory</option>
                      <option value="optional">Optional</option>
                    </select>
                  </MiniField>
                  {canEdit && (
                    <>
                      <OrderButtons index={i} count={weeks.length} label={w.label || "week"} onMove={(dir) => set("weeks", moveItem(weeks, i, dir))} />
                      <button type="button" className={styles.ico} aria-label={`Remove ${w.label || "week"}`} title="Remove" onClick={() => set("weeks", weeks.filter((_, j) => j !== i))}>
                        <X size={16} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
                <MiniField label="Note (Optional)">
                  <input className={`${styles.inp} ${styles.inpSmall}`} value={w.note ?? ""} disabled={!canEdit} onChange={(e) => setWeek(i, { note: e.target.value })} />
                </MiniField>
              </div>
            ))}
            {canEdit && <AddButton label="Add Week" onClick={() => set("weeks", [...weeks, { label: `Week ${weeks.length + 1}`, topic: "" }])} />}
            <label className={styles.radio}>
              <input type="checkbox" checked={f.trailTentative} disabled={!canEdit} onChange={(e) => set("trailTentative", e.target.checked)} />
              Weekly Topics Tentative
            </label>
            {text("weeksNote", "Trail Note", { placeholder: "Weekly topics are indicative and may shift to fit the lodge." })}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Captains</h2>
            <span className={styles.hint}>Lodge heads.</span>
            {captains.map((c, i) => (
              <div key={i} className={styles.subItem}>
                <div className={styles.rowEnd}>
                  <button
                    type="button"
                    className={styles.avatarBtn}
                    title={c.image ? "Replace Photo" : "Add Photo"}
                    aria-label={c.image ? `Replace photo of ${c.name || "this captain"}` : `Add photo of ${c.name || "this captain"}`}
                    disabled={!canEdit || photos.busy}
                    onClick={() => upload("photo", (url) => setCaptain(i, { image: url }))}
                  >
                    {c.image ? <Image src={c.image} alt="" fill sizes="42px" style={{ objectFit: "cover" }} /> : <Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
                  </button>
                  <MiniField label="Name">
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={c.name} disabled={!canEdit} onChange={(e) => setCaptain(i, { name: e.target.value })} />
                  </MiniField>
                  <MiniField label="School and Year">
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={c.detail} placeholder="SCIS (IS) / Year 2" disabled={!canEdit} onChange={(e) => setCaptain(i, { detail: e.target.value })} />
                  </MiniField>
                  <MiniField label="Telegram Handle">
                    <input className={`${styles.inp} ${styles.inpSmall}`} value={c.telegram} disabled={!canEdit} onChange={(e) => setCaptain(i, { telegram: e.target.value })} />
                  </MiniField>
                  {canEdit && <OrderButtons index={i} count={captains.length} label={c.name || "captain"} onMove={(dir) => set("captains", moveItem(captains, i, dir))} />}
                  {canEdit && (
                    <button type="button" className={styles.ico} aria-label={`Remove ${c.name || "this captain"}`} onClick={() => set("captains", captains.filter((_, j) => j !== i))}>
                      <X size={16} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canEdit && <AddButton label="Add Captain" onClick={() => set("captains", [...captains, { name: "", detail: "", telegram: "", image: "" }])} />}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Logo and Colours</h2>
            {imageField(f.logo, (url) => set("logo", url), "Logo", "PNG, SVG or WebP with transparency. Shown on the card, strip and header.")}
            <div className={styles.grid2}>
              {select("Logo Rendering", f.logoStyle, LODGE_LOGO_STYLES, (v) => LODGE_LOGO_STYLE_LABEL[v], (v) => set("logoStyle", v as LodgeLogoStyle), "Glow colour suits one-colour logos.")}
              {select("Fallback Emblem", f.emblem, LODGE_EMBLEMS, cap, (v) => set("emblem", v as LodgeEmblem), "Shown when no logo is set.")}
            </div>
            <div className={styles.grid2}>
              {color("accent", "Accent Colour", "Badges, bullets and tints.")}
              {color("neonColor", "Glow Colour", "Lit logo and neon sign. Empty uses the accent.")}
            </div>
            {select(
              "Neon Sign",
              f.neonSign,
              LODGE_NEON_SIGNS,
              (v) => LODGE_NEON_SIGN_LABEL[v],
              (v) => set("neonSign", v as LodgeNeonSign),
              "Coded on the AI Lodge site. Replaces the logo on the card and strip."
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Page Header</h2>
            {select("Header Art", f.hero.kind, LODGE_HERO_KINDS, (v) => LODGE_HERO_KIND_LABEL[v], (kind) =>
              set("hero", kind === "showpiece" ? { kind, showpiece: f.hero.showpiece ?? "despacito" } : kind === "custom" ? { glow: "", particles: "none", float: true, ...f.hero, kind } : { ...f.hero, kind })
            )}
            {f.hero.kind === "neon" && f.neonSign === "none" && <span className={styles.hint}>Neon sign required. Set it under Logo and Colours.</span>}
            {f.hero.kind === "showpiece" &&
              select("Showpiece", f.hero.showpiece ?? "despacito", LODGE_SHOWPIECES, (v) => LODGE_SHOWPIECE_LABEL[v], (v) => setHero({ showpiece: v }), "Animated art coded on the AI Lodge site.")}
            {f.hero.kind === "custom" && (
              <>
                {imageField(f.hero.image ?? "", (url) => setHero({ image: url }), "Showpiece Image", "Transparent PNG or WebP recommended.")}
                <div className={styles.grid2}>
                  <label className={styles.fld}>
                    Background Glow
                    <span className={styles.row}>
                      <input type="color" className={styles.colorSwatch} value={f.hero.glow || glow} aria-label="Background glow picker" disabled={!canEdit} onChange={(e) => setHero({ glow: e.target.value.toUpperCase() })} />
                      <input className={`${styles.inp} ${styles.inpSmall}`} style={{ maxWidth: 130 }} value={f.hero.glow ?? ""} placeholder="No glow" disabled={!canEdit} onChange={(e) => setHero({ glow: e.target.value })} />
                    </span>
                  </label>
                  {select("Particles", f.hero.particles ?? "none", LODGE_PARTICLES, (v) => LODGE_PARTICLES_LABEL[v], (v) => setHero({ particles: v }))}
                </div>
                <label className={styles.radio}>
                  <input type="checkbox" checked={f.hero.float !== false} disabled={!canEdit} onChange={(e) => setHero({ float: e.target.checked })} />
                  Float and Follow Pointer
                </label>
              </>
            )}
            {f.hero.kind === "animated" &&
              imageField(f.hero.image ?? "", (url) => setHero({ image: url }), "Animated SVG", "Shown as uploaded, with its animations.")}
            <span className={styles.hint}>Logo and neon sign options add a faint logo behind the header. Showpieces have their own backdrop.</span>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Header Strip</h2>
            {select("Strip Style", f.belt.mode, LODGE_BELT_MODES, (v) => LODGE_BELT_MODE_LABEL[v], (mode) => setBelt({ mode }))}
            {f.belt.mode === "tile" &&
              imageField(f.belt.image ?? "", (url) => setBelt({ image: url }), "Repeating Image", "Small transparent image, repeated in a line.")}
            {f.belt.mode === "banner" &&
              imageField(f.belt.image ?? "", (url) => setBelt({ image: url }), "Strip Image", "Seamless left and right edges, about 3000 × 160 px. Scrolls in a loop.", true)}
            {f.belt.mode !== "none" && (
              <div className={styles.grid2}>
                {select("Speed", f.belt.speed, LODGE_BELT_SPEEDS, cap, (speed) => setBelt({ speed }))}
                {select("Size", f.belt.size, LODGE_BELT_SIZES, cap, (size) => setBelt({ size }))}
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <h2 className={styles.h2}>Ambient Particles</h2>
            <div className={styles.grid2}>
              {select("Particle Style", f.ambient, LODGE_AMBIENTS, (v) => LODGE_AMBIENT_LABEL[v], (v) => set("ambient", v as LodgeAmbient))}
              <label className={styles.radio} style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={f.ambientGlow} disabled={!canEdit} onChange={(e) => set("ambientGlow", e.target.checked)} />
                Particle Glow
              </label>
            </div>
            {imageField(f.ambientImage, (url) => set("ambientImage", url), "Custom Particle", "Optional small image. Replaces the preset.")}
          </section>

        </div>

        <aside className={styles.colSide}>
          {canEdit && (
            <div className={styles.panelTight}>
              <UnsavedNote show={dirty} onDiscard={() => setF(initial)} />
              <button type="button" className={styles.btn} onClick={save} disabled={saving || !dirty || !f.name.trim()}>
                {saving ? "Saving…" : "Save Lodge"}
              </button>
              <span className={styles.hint}>Saved changes apply to the AI Lodge site immediately.</span>
            </div>
          )}
          <span className={styles.monoLabel}>Card Preview</span>
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
                {f.status === "closed" && <span className={styles.lodgeBadgeMuted}>Applications closed</span>}
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
          <dl className={styles.metaList}>
            <dt>Header</dt>
            <dd>{f.hero.kind === "showpiece" && f.hero.showpiece ? LODGE_SHOWPIECE_LABEL[f.hero.showpiece] : LODGE_HERO_KIND_LABEL[f.hero.kind]}</dd>
            <dt>Strip</dt>
            <dd>{LODGE_BELT_MODE_LABEL[f.belt.mode]}</dd>
            <dt>Neon sign</dt>
            <dd>{LODGE_NEON_SIGN_LABEL[f.neonSign]}</dd>
            <dt>Particles</dt>
            <dd>
              {f.ambientImage ? "Custom image" : LODGE_AMBIENT_LABEL[f.ambient]}
              {f.ambientGlow ? ", glow" : ""}
            </dd>
          </dl>
          <span className={styles.hint}>Motion renders on the AI Lodge site only.</span>
          <div className={styles.row}>
            <ExternalAction quiet href={siteHref} label="View on AI Lodge Site" />
            {canEdit && (
              <button type="button" className={`${styles.lnk} ${styles.lnkDanger}`} onClick={remove}>
                Delete Lodge
              </button>
            )}
          </div>
        </aside>
      </div>
      {art.cropper}
      {photos.cropper}
      {node}
    </>
  );
}
