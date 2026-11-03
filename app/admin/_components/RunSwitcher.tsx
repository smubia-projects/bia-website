"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { PROGRAMMES, type Programme } from "@/app/lib/cms/taxonomy";
import { RUN_NOUN, RUN_SECTIONS, newRunHref, runHref, type RunOption } from "./runs";
import styles from "../cms.module.css";

/**
 * The run picker at the top of the sidebar, like Vercel's project switcher:
 * one button showing the run, a list of every semester and cohort, and a
 * "New" link per programme. Switching keeps the page you're on when the other
 * run has it (DAP Groups → the other cohort's Groups).
 */
export default function RunSwitcher({
  runs,
  current,
  section,
  canCreate,
}: {
  runs: RunOption[];
  current: RunOption | null;
  section: string;
  canCreate: Record<Programme, boolean>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const programmes = PROGRAMMES.filter((p) => runs.some((r) => r.programme === p) || canCreate[p]);
  const hrefFor = (r: RunOption) =>
    runHref(r.programme, r.slug, r.programme === current?.programme && RUN_SECTIONS[r.programme].some((s) => s.key === section) ? section : "");

  return (
    <div ref={ref} className={styles.switcher}>
      <button
        type="button"
        className={styles.switcherBtn}
        aria-expanded={open}
        aria-controls="cms-run-list"
        aria-label={current ? `Switch semester or cohort. Current: ${current.programme} ${current.name}` : "Select a semester or cohort"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.switcherText}>
          <span className={styles.switcherProgramme}>{current?.programme ?? "Programme"}</span>
          <span className={styles.switcherName}>{current?.name ?? "None selected"}</span>
        </span>
        <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div id="cms-run-list" className={styles.switcherPanel}>
          {programmes.map((programme) => (
            <div key={programme} className={styles.switcherGroup}>
              <div className={styles.switcherGroupLabel}>{programme}</div>
              <ul className={styles.switcherList}>
                {runs
                  .filter((r) => r.programme === programme)
                  .map((r) => {
                    const on = r.programme === current?.programme && r.slug === current.slug;
                    return (
                      <li key={r.slug}>
                        <Link
                          href={hrefFor(r)}
                          className={`${styles.switcherItem} ${on ? styles.switcherItemOn : ""}`}
                          aria-current={on ? "page" : undefined}
                          onClick={() => setOpen(false)}
                        >
                          <span className={styles.switcherCheck} aria-hidden="true">
                            {on && <Check size={14} strokeWidth={2} />}
                          </span>
                          <span className={styles.switcherItemName}>{r.name}</span>
                          {r.visibility === "live" && <span className={styles.switcherTag}>Current</span>}
                          {r.visibility === "hidden" && <span className={styles.switcherTagMuted}>Hidden</span>}
                        </Link>
                      </li>
                    );
                  })}
              </ul>
              {canCreate[programme] && (
                <Link href={newRunHref(programme)} className={styles.switcherNew} onClick={() => setOpen(false)}>
                  <Plus size={14} strokeWidth={2} aria-hidden="true" />
                  New {RUN_NOUN[programme] === "semester" ? "Semester" : "Cohort"}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
