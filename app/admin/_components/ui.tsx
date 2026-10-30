"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImageAction, type ActionResult } from "../actions";
import styles from "../cms.module.css";
import ImageCropper from "./ImageCropper";

/** Bottom toast, as in the approved CMS flows. */
export function useToast() {
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((text: string, error = false) => {
    setToast({ text, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), error ? 6000 : 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = toast ? (
    <div role="status" className={`${styles.toast} ${toast.error ? styles.toastError : ""}`}>
      {toast.text}
    </div>
  ) : null;
  return { show, node };
}

const LEAVE_MESSAGE = "You have unsaved changes. Leave this page and lose them?";

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
export function useImageUpload(folder: "projects" | "newsletter" | "team" | "lodges" = "projects") {
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
