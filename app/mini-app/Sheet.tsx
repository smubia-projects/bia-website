"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import styles from "./mini-app.module.css";

/** A bottom sheet: dialog semantics, Escape and backdrop close, page scroll locked while open. */
export function Sheet({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: React.ReactNode }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const lock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("input, textarea, select, button[data-autofocus]")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = lock;
      window.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header className={styles.sheetHead}>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 id={id} className={styles.sheetTitle}>
              {title}
            </h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/**
 * A form inside a sheet. `onSubmit` returns an error message or null; null closes the sheet.
 * `remove` adds a destructive action that asks for confirmation inside the sheet before it runs.
 */
export function SheetForm({
  submit,
  onSubmit,
  remove,
  onClose,
  children,
}: {
  submit: string;
  onSubmit: () => Promise<string | null>;
  remove?: { label: string; warning: string; run: () => Promise<string | null> };
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(job: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const failure = await job();
    setBusy(false);
    if (failure) {
      setError(failure);
      setConfirming(false);
    } else onClose();
  }

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !confirming) run(onSubmit);
      }}
    >
      <div className={styles.fields}>{children}</div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {confirming && remove ? (
        <div className={styles.confirm} role="alertdialog" aria-label="Confirm deletion">
          <p>{remove.warning}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.buttonQuiet} onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className={styles.buttonDanger} data-autofocus onClick={() => run(remove.run)} disabled={busy}>
              {busy && <Loader2 size={16} className={styles.spin} aria-hidden />}
              Confirm Delete
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          {remove && (
            <button type="button" className={styles.buttonDangerQuiet} onClick={() => setConfirming(true)} disabled={busy}>
              <Trash2 size={16} strokeWidth={1.75} aria-hidden />
              {remove.label}
            </button>
          )}
          <button type="submit" className={styles.buttonPrimary} disabled={busy}>
            {busy && <Loader2 size={16} className={styles.spin} aria-hidden />}
            {submit}
          </button>
        </div>
      )}
    </form>
  );
}

/** A labelled field; the label wraps its control so the whole label focuses it. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

/** Exclusive choice shown as a segmented control (radio inputs underneath, so it works by keyboard and screen reader). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const name = useId();
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>{label}</legend>
      <div className={styles.segmented}>
        {options.map((o) => (
          <label key={o.value} className={styles.segment}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
