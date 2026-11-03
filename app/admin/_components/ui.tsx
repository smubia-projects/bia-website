"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, ExternalLink, Plus, Search, X } from "lucide-react";
import { uploadImageAction, type ActionResult } from "../actions";
import styles from "../cms.module.css";
import ImageCropper from "./ImageCropper";

/**
 * Page title with an optional one-line description and the page's actions on the
 * same row. Crumbs are only the pages above this one, never the page itself.
 */
export function PageHead({
  title,
  sub,
  crumbs,
  children,
}: {
  title: string;
  sub?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <>
      {crumbs && (
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          {crumbs.map((c) => (
            <span key={c.href} className={styles.crumbItem}>
              <Link href={c.href}>{c.label}</Link>
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </span>
          ))}
        </nav>
      )}
      <div className={styles.pageHead}>
        <div className={styles.pageHeadText}>
          <h1 className={styles.h1}>{title}</h1>
          {sub && <p className={styles.sub}>{sub}</p>}
        </div>
        {children && <div className={styles.row}>{children}</div>}
      </div>
    </>
  );
}

/** A link that opens in a new tab, marked as such. */
export function ExternalAction({ href, label, quiet }: { href: string; label: string; quiet?: boolean }) {
  return (
    <a className={quiet ? styles.lnk : styles.pill} href={href} target="_blank" rel="noopener noreferrer">
      {label}
      <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" style={quiet ? { marginLeft: 4 } : undefined} />
    </a>
  );
}

/** A small visible label for a field inside a repeating row. */
export function MiniField({ label, grow = 1, children }: { label: string; grow?: number; children: React.ReactNode }) {
  return (
    <label className={styles.fldMini} style={{ flexGrow: grow }}>
      {label}
      {children}
    </label>
  );
}

export function MarkdownHint({ children }: { children?: React.ReactNode }) {
  return (
    <span className={styles.hint}>
      <a className={`${styles.lnk} ${styles.lnkInline}`} href="https://commonmark.org/help/" target="_blank" rel="noopener noreferrer">
        Markdown
      </a>{" "}
      supported. {children}
    </span>
  );
}

/** Moves one item of a list; the caller's bounds are enforced by OrderButtons. */
export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = list.slice();
  [next[index], next[index + dir]] = [next[index + dir], next[index]];
  return next;
}

export function OrderButtons({ index, count, label, disabled, onMove }: { index: number; count: number; label: string; disabled?: boolean; onMove: (dir: -1 | 1) => void }) {
  return (
    <span className={styles.trackOrder}>
      <button type="button" className={styles.ico} aria-label={`Move ${label} up`} title="Move Up" disabled={disabled || index === 0} onClick={() => onMove(-1)}>
        <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <button type="button" className={styles.ico} aria-label={`Move ${label} down`} title="Move Down" disabled={disabled || index === count - 1} onClick={() => onMove(1)}>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </span>
  );
}

/** Ctrl/Cmd+S saves. The browser's save dialog is never useful on these pages. */
export function useSaveShortcut(save: () => void, enabled: boolean) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (enabled) save();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [save, enabled]);
}

/** A modal form: focus is trapped, Esc cancels, Enter submits. */
export function Modal({
  title,
  sub,
  onClose,
  onSubmit,
  footer,
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  onSubmit?: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <h2 id={titleId} className={styles.h2}>
          {title}
        </h2>
        {sub && <p className={styles.dialogBody}>{sub}</p>}
        <div className={styles.dialogFields}>{children}</div>
        <div className={styles.dialogActions}>{footer}</div>
      </form>
    </dialog>
  );
}

export interface PickerGroup {
  label: string;
  items: { id: string; title: string; meta?: string }[];
}

/** Choose several records from a searchable checkbox list. */
export function PickerDialog({
  title,
  sub,
  groups,
  busy,
  actionLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  sub?: string;
  groups: PickerGroup[];
  busy?: boolean;
  actionLabel: (count: number) => string;
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !query || `${i.title} ${i.meta ?? ""}`.toLowerCase().includes(query)) }))
    .filter((g) => g.items.length > 0);
  const shownIds = shown.flatMap((g) => g.items.map((i) => i.id));
  const allShown = shownIds.length > 0 && shownIds.every((id) => picked.includes(id));
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  return (
    <Modal
      title={title}
      sub={sub}
      onClose={onClose}
      onSubmit={() => picked.length > 0 && !busy && onConfirm(picked)}
      footer={
        <>
          <span className={styles.hint} style={{ marginRight: "auto" }} role="status">
            {picked.length} selected
          </span>
          <button type="button" className={styles.pill} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={styles.btn} disabled={busy || picked.length === 0}>
            {busy ? "Saving…" : actionLabel(picked.length)}
          </button>
        </>
      }
    >
      <div className={styles.searchField}>
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <input className={styles.inp} type="search" autoFocus placeholder="Search" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={styles.pickList}>
        {shown.length === 0 && <p className={styles.empty}>No results match the search.</p>}
        {shown.map((g) => (
          <fieldset key={g.label} className={styles.pickGroup}>
            <legend className={styles.monoLabel}>{g.label}</legend>
            {g.items.map((i) => (
              <label key={i.id} className={styles.pickItem}>
                <input type="checkbox" checked={picked.includes(i.id)} onChange={(e) => toggle(i.id, e.target.checked)} />
                <span className={styles.pickTitle}>{i.title}</span>
                {i.meta && <span className={styles.hint}>{i.meta}</span>}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      {shownIds.length > 1 && (
        <button
          type="button"
          className={styles.lnk}
          style={{ alignSelf: "flex-start" }}
          onClick={() => setPicked((p) => (allShown ? p.filter((id) => !shownIds.includes(id)) : Array.from(new Set([...p, ...shownIds]))))}
        >
          {allShown ? "Clear Selection" : "Select All Shown"}
        </button>
      )}
    </Modal>
  );
}

/** The dashed "add a row" button used by every repeating list. */
export function AddButton({ label, onClick, disabled, style }: { label: string; onClick: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button type="button" className={styles.add} style={{ alignSelf: "flex-start", ...style }} disabled={disabled} onClick={onClick}>
      <Plus size={14} strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );
}

/** Shown beside a save button while the form differs from what is saved. */
export function UnsavedNote({ show, onDiscard }: { show: boolean; onDiscard?: () => void }) {
  if (!show) return null;
  return (
    <span className={styles.saveState}>
      Unsaved changes
      {onDiscard && (
        <button type="button" className={`${styles.lnk} ${styles.lnkInline}`} onClick={onDiscard}>
          Discard
        </button>
      )}
    </span>
  );
}

export interface ConfirmOptions {
  title: string;
  body?: string;
  /** The confirm button: verb + object, naming the effect */
  action: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

/** Asks before a destructive or irreversible action. Resolves true when confirmed. */
export const useConfirm = () => useContext(ConfirmContext);

/** Holds the one confirmation dialog of the CMS. Focus starts on Cancel, the safe choice. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOptions(next);
      }),
    []
  );

  useEffect(() => {
    if (options && !dialog.current?.open) dialog.current?.showModal();
  }, [options]);

  const finish = (confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    dialog.current?.close();
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          role="alertdialog"
          aria-labelledby="cms-confirm-title"
          onCancel={(e) => {
            e.preventDefault();
            finish(false);
          }}
        >
          <h2 id="cms-confirm-title" className={styles.h2}>
            {options.title}
          </h2>
          {options.body && <p className={styles.dialogBody}>{options.body}</p>}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.pill} autoFocus onClick={() => finish(false)}>
              Cancel
            </button>
            <button type="button" className={`${styles.btn} ${options.danger ? styles.btnDanger : ""}`} onClick={() => finish(true)}>
              {options.action}
            </button>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
}

/** Bottom toast, as in the approved CMS flows. */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string, error = false) => {
    setToast({ text, error });
    clearTimeout(timer.current);
    // Errors stay until dismissed, so they can be read and acted on.
    if (!error) timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast ? (
    <div role={toast.error ? "alert" : "status"} className={`${styles.toast} ${toast.error ? styles.toastError : ""}`}>
      <span>{toast.text}</span>
      {toast.error && (
        <button type="button" className={styles.toastClose} aria-label="Dismiss" onClick={() => setToast(null)}>
          <X size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </div>
  ) : null;
  return { show, node };
}

const LEAVE_MESSAGE = "Unsaved changes will be lost. Leave this page?";

/**
 * Warns before unsaved edits are lost: on reload or closing the tab, and on
 * clicking a link elsewhere in the CMS (the App Router has no navigation guard).
 */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}

/** Shows an action's error (or its message) and returns the data on success. */
export function useActionToast() {
  const toast = useToast();
  const handle = useCallback(
    <T,>(res: ActionResult<T>, success?: string): T | undefined => {
      if (!res.ok) {
        toast.show(res.error, true);
        return undefined;
      }
      if (success || res.message) toast.show(success ?? res.message ?? "");
      return res.data;
    },
    [toast]
  );
  return { ...toast, handle };
}

export function StatusChip({ status, label }: { status: string; label: string }) {
  const cls = styles[`st_${status}` as keyof typeof styles] ?? styles.st_none;
  return <span className={`${styles.status} ${cls}`}>{label}</span>;
}

type CropJob = { src: string; name: string; resolve: (blob: Blob | null) => void };

/**
 * Pick → crop → upload. Returns the hosted URL (Vercel Blob, or /uploads on
 * localhost). `aspect` null skips cropping (e.g. newsletter images).
 */
export function useImageUpload(folder: "projects" | "newsletter" | "team" | "lodges" | "site" = "projects") {
  const [job, setJob] = useState<CropJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [aspect, setAspect] = useState<{ ratio: number; label: string } | null>(null);

  const pick = useCallback(
    (crop: { ratio: number; label: string } | null): Promise<string | null> =>
      new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = `image/png,image/jpeg,image/webp,image/gif,image/avif${folder === "lodges" && !crop ? ",image/svg+xml" : ""}`;
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          try {
            let blob: Blob = file;
            if (crop) {
              setAspect(crop);
              const src = URL.createObjectURL(file);
              const cropped = await new Promise<Blob | null>((res) => setJob({ src, name: file.name, resolve: res }));
              URL.revokeObjectURL(src);
              setJob(null);
              if (!cropped) return resolve(null);
              blob = cropped;
            }
            setBusy(true);
            const fd = new FormData();
            fd.append("file", blob, file.name.replace(/\.\w+$/, "") + (crop ? ".jpg" : file.name.match(/\.\w+$/)?.[0] ?? ""));
            fd.append("name", crop ? file.name.replace(/\.\w+$/, ".jpg") : file.name);
            fd.append("folder", folder);
            const res = await uploadImageAction(fd);
            setBusy(false);
            if (!res.ok) return reject(new Error(res.error));
            resolve(res.data);
          } catch (e) {
            setBusy(false);
            reject(e);
          }
        };
        input.click();
      }),
    [folder]
  );

  const cropper =
    job && aspect ? (
      <ImageCropper
        imageSrc={job.src}
        aspectRatio={aspect.ratio}
        aspectLabel={aspect.label}
        onComplete={(blob) => job.resolve(blob)}
        onCancel={() => job.resolve(null)}
      />
    ) : busy ? (
      <div role="status" className={styles.toast}>
        Uploading image…
      </div>
    ) : null;

  return { pick, busy, cropper };
}

export function formatEdited(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.round(diff / 60000)} min ago`;
  if (diff < day) return `${Math.round(diff / 3600000)} h ago`;
  return new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
