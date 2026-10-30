"use client";

import type { LucideIcon } from "lucide-react";
import styles from "./public.module.css";

export interface ViewOption<T extends string> {
  value: T;
  label: string;
  Icon: LucideIcon;
}

/** Icon-only segmented switch for list layouts (wall / cards, shelves / grid). */
export default function ViewToggle<T extends string>({
  options,
  value,
  onChange,
  label = "View",
}: {
  options: ViewOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className={styles.viewToggle}>
      {options.map(({ value: v, label: l, Icon }) => (
        <button
          key={v}
          type="button"
          className={`${styles.viewBtn} ${v === value ? styles.viewBtnOn : ""}`}
          aria-pressed={v === value}
          aria-label={l}
          title={l}
          onClick={() => onChange(v)}
        >
          <Icon size={17} strokeWidth={2} aria-hidden />
        </button>
      ))}
    </div>
  );
}
