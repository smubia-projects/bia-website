"use client";

import { useCallback } from "react";

/**
 * The timeline's scroll box. On first render it scrolls so today sits a third of the way in,
 * past the sticky lane labels; a phone otherwise opens on the weeks before today.
 */
export default function ScrollToToday({ className, todayPct, children }: { className: string; todayPct: number; children: React.ReactNode }) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el || el.scrollWidth <= el.clientWidth) return;
      // The axis row's first cell is as wide as the sticky lane labels.
      const label = (el.firstElementChild?.firstElementChild?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      const track = el.scrollWidth - label;
      el.scrollLeft = Math.max(0, (track * todayPct) / 100 - (el.clientWidth - label) / 3);
    },
    [todayPct]
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
