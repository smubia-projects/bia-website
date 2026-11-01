"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Photo, PhotoSlot, SitePhotos } from "@/app/lib/photos";
import { saveSitePhotoAction } from "../../actions";
import { useActionToast, useImageUpload, useUnsavedChanges } from "../../_components/ui";
import styles from "../../cms.module.css";

type Value = Photo | Photo[];

const PREVIEW_WIDTH = 1280;
const PREVIEW_HEIGHT = 860;

const valueOf = (photos: SitePhotos, slot: PhotoSlot): Value =>
  slot.kind === "gallery" ? photos.gallery[slot.key] ?? slot.default : photos.single[slot.key] ?? slot.default;

/**
 * Every static photo on the site, grouped by page. The selected photo shows in a
 * live preview of its page beside the list (same-origin pages are loaded in a
 * frame and the new photo is swapped into the [data-photo-slot] image).
 */
export default function PhotosManager({ photos, slots }: { photos: SitePhotos; /** The slots this person may edit */ slots: PhotoSlot[] }) {
  const router = useRouter();
  const { handle, node, show } = useActionToast();
  const [drafts, setDrafts] = useState<Record<string, Value>>({});
  const [selected, setSelected] = useState(slots[0].key);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadSlot, setUploadSlot] = useState<PhotoSlot>(slots[0]);
  const uploader = useImageUpload("site");
  useUnsavedChanges(busy === null && Object.keys(drafts).length > 0);

  const current = (slot: PhotoSlot) => drafts[slot.key] ?? valueOf(photos, slot);
  const slot = slots.find((s) => s.key === selected)!;
  const pages = Array.from(new Set(slots.map((s) => s.page)));
  const setDraft = (key: string, v: Value) => setDrafts((d) => ({ ...d, [key]: v }));
  const dropDraft = (key: string) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });

  async function pick(s: PhotoSlot): Promise<string | null> {
    setUploadSlot(s);
    try {
      return await uploader.pick(s.ratio ? { ratio: s.ratio, label: ratioLabel(s.ratio) } : null);
    } catch (e) {
      show(e instanceof Error ? e.message : "Upload failed", true);
      return null;
    }
  }

  async function save(s: PhotoSlot, value: Value | null) {
    setBusy(s.key);
    const ok = handle(await saveSitePhotoAction(s.key, value), value === null ? `${s.label}: original photo back` : `${s.label} saved`);
    setBusy(null);
    if (ok !== undefined) {
      dropDraft(s.key);
      router.refresh();
    }
  }

  return (
    <>
      <div className={styles.pageHead}>
        <div>
          <h1 className={styles.h1}>Photos</h1>
          <p className={styles.sub}>
            Every photo on the site. Pick one to see it in place on its page, upload a replacement, and save. The original photo can always be put back.
          </p>
        </div>
      </div>

      <div className={styles.cols} style={{ marginTop: 22 }}>
        <div className={styles.colMain} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {pages.map((page) => (
            <section key={page} className={styles.panel} style={{ gap: 10 }}>
              <h2 className={styles.h2}>{page}</h2>
              {page === "AI Lodge site" && (
                <span className={styles.hint}>The AI Lodge site shows these once it reads them from smubia.com (see docs/ailodge-site-handoff.md).</span>
              )}
              {slots.filter((s) => s.page === page).map((s) => {
                const value = current(s);
                const dirty = s.key in drafts;
                const custom = photos.custom.includes(s.key);
                const on = s.key === selected;
                return (
                  <div
                    key={s.key}
                    className={`${styles.photoSlot} ${on ? styles.photoSlotOn : ""}`}
                    onClick={() => setSelected(s.key)}
                    onFocus={() => setSelected(s.key)}
                  >
                    {Array.isArray(value) ? (
                      <GalleryField
                        slotLabel={s.label}
                        hint={s.hint}
                        items={value}
                        busy={uploader.busy}
                        onChange={(items) => setDraft(s.key, items)}
                        onAdd={async () => {
                          const url = await pick(s);
                          if (url) setDraft(s.key, [...value, { src: url, alt: "" }]);
                        }}
                      />
                    ) : (
                      <div className={styles.photoRow}>
                        <span className={styles.photoThumb}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={value.src} alt="" />
                        </span>
                        <span className={styles.photoFields}>
                          <span className={styles.trackName}>
                            {s.label}
                            {custom && !dirty && <span className={styles.count}>replaced</span>}
                            {dirty && <span className={styles.count}>not saved</span>}
                          </span>
                          {s.hint && <span className={styles.hint}>{s.hint}</span>}
                          <input
                            className={`${styles.inp} ${styles.inpSmall}`}
                            value={value.alt}
                            placeholder="Describe the photo for screen readers"
                            aria-label={`${s.label}: alt text`}
                            onChange={(e) => setDraft(s.key, { ...value, alt: e.target.value })}
                          />
                        </span>
                      </div>
                    )}
                    <div className={styles.row}>
                      {!Array.isArray(value) && (
                        <button
                          type="button"
                          className={styles.pill}
                          disabled={uploader.busy}
                          onClick={async () => {
                            const url = await pick(s);
                            if (url) setDraft(s.key, { ...(value as Photo), src: url });
                          }}
                        >
                          {uploader.busy && uploadSlot.key === s.key ? "Uploading…" : "Replace photo"}
                        </button>
                      )}
                      {dirty && (
                        <>
                          <button type="button" className={styles.btn} disabled={busy === s.key} onClick={() => save(s, value)}>
                            {busy === s.key ? "Saving…" : "Save"}
                          </button>
                          <button type="button" className={styles.lnk} onClick={() => dropDraft(s.key)}>
                            Discard
                          </button>
                        </>
                      )}
                      {custom && !dirty && (
                        <button type="button" className={styles.lnk} disabled={busy === s.key} onClick={() => confirm(`Put the original photo back for ${s.label}?`) && save(s, null)}>
                          Use the original
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        <aside className={styles.colSide}>
          <span className={styles.monoLabel}>Preview · {slot.page}</span>
          <strong style={{ color: "var(--ink)" }}>{slot.label}</strong>
          <PagePreview slot={slot} value={current(slot)} />
          <span className={styles.hint}>
            {slot.path.startsWith("/")
              ? "The real page, with this photo swapped in. Unsaved changes show here first."
              : "This photo is on the AI Lodge site, so the preview shows the photo itself."}
          </span>
        </aside>
      </div>
      {uploader.cropper}
      {node}
    </>
  );
}

function ratioLabel(r: number) {
  if (r === 1) return "1:1 · square";
  if (Math.abs(r - 16 / 9) < 0.01) return "16:9 · wide";
  if (Math.abs(r - 9 / 16) < 0.01) return "9:16 · portrait";
  return `${r.toFixed(2)}:1`;
}

/** The ordered photos of a gallery slot. */
function GalleryField({
  slotLabel,
  hint,
  items,
  busy,
  onChange,
  onAdd,
}: {
  slotLabel: string;
  hint?: string;
  items: Photo[];
  busy: boolean;
  onChange: (items: Photo[]) => void;
  onAdd: () => void;
}) {
  const move = (i: number, to: number) => {
    const next = [...items];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };
  return (
    <div className={styles.photoFields} style={{ width: "100%" }}>
      <span className={styles.trackName}>{slotLabel}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
      <div className={styles.photoGallery}>
        {items.map((p, i) => (
          <div key={`${p.src}-${i}`} className={styles.photoGalleryItem}>
            <span className={styles.photoThumb}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" />
            </span>
            <input
              className={`${styles.inp} ${styles.inpSmall}`}
              value={p.alt}
              placeholder="Alt text"
              aria-label={`Photo ${i + 1}: alt text`}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
            />
            <span className={styles.trackOrder}>
              <button type="button" className={styles.ico} aria-label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                ←
              </button>
              <button type="button" className={styles.ico} aria-label={`Move photo ${i + 1} later`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                →
              </button>
              <button type="button" className={styles.ico} aria-label={`Remove photo ${i + 1}`} disabled={items.length === 1} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                ×
              </button>
            </span>
          </div>
        ))}
      </div>
      <button type="button" className={styles.add} style={{ alignSelf: "flex-start" }} disabled={busy} onClick={onAdd}>
        + Photo
      </button>
    </div>
  );
}

/**
 * Loads the slot's page in a scaled-down frame, scrolls to the photo and swaps in
 * the draft. Pages on other sites (the AI Lodge site) can't be reached from here,
 * so those show the photo on its own.
 */
function PagePreview({ slot, value }: { slot: PhotoSlot; value: Value }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const sameOrigin = slot.path.startsWith("/");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / PREVIEW_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, [sameOrigin]);

  const apply = useCallback(() => {
    const doc = frame.current?.contentDocument;
    if (!doc || Array.isArray(value)) return;
    const imgs = Array.from(doc.querySelectorAll<HTMLImageElement>(`[data-photo-slot="${slot.key}"]`));
    imgs.forEach((img) => {
      if (img.getAttribute("src") !== value.src) {
        img.removeAttribute("srcset");
        img.src = value.src;
      }
      img.alt = value.alt;
    });
    imgs[0]?.scrollIntoView({ block: "center" });
  }, [slot.key, value]);

  // Re-apply after the page hydrates and its entrance animations settle.
  useEffect(() => {
    apply();
    const timers = [400, 1200, 2500].map((ms) => setTimeout(apply, ms));
    return () => timers.forEach(clearTimeout);
  }, [apply]);

  if (!sameOrigin) {
    const list = Array.isArray(value) ? value : [value];
    return (
      <div className={styles.photoPreviewStatic}>
        {list.slice(0, 9).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${p.src}-${i}`} src={p.src} alt="" />
        ))}
      </div>
    );
  }

  return (
    <div ref={box} className={styles.photoPreview} style={{ height: PREVIEW_HEIGHT * scale }}>
      <iframe
        ref={frame}
        key={slot.path}
        src={slot.path}
        title={`Preview of ${slot.page}`}
        onLoad={apply}
        style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, transform: `scale(${scale})` }}
        tabIndex={-1}
      />
    </div>
  );
}
