"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import styles from "./ProjectsMarquee.module.css";
import { Project } from "@/app/Projects/data/types";

interface Props {
  projects: Project[];
  /** Colour the left/right edge fades blend into (defaults to page --bg). */
  fadeLeft?: string;
  fadeRight?: string;
  /** Use the larger, slower, snap-aligned card treatment on mobile. */
  mobileFocused?: boolean;
}

/** Delay before autoscroll resumes after the user lets go of the rail. */
const RESUME_AFTER_MS = 2000;

// Hover/tap motion lives in CSS: the rail renders three copies of every card,
// and a framer-motion component per card made hydration heavy on phones.
function MarqueeSlide({
  project,
  duplicate,
}: {
  project: Project;
  /** Loop copies are hidden from assistive tech and the tab order. */
  duplicate: boolean;
}) {
  const image = project.coverImage || project.images.find(Boolean) || "";
  const isAILodge = project.badge === "AI Lodge";

  return (
    <Link
      href={`/Projects/${project.slug}`}
      className={styles.slide}
      aria-label={`${project.title} — ${project.badge}`}
      aria-hidden={duplicate || undefined}
      tabIndex={duplicate ? -1 : undefined}
    >
      <div className={styles.slideMedia}>
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            className={styles.slideImg}
            sizes="(max-width: 639px) 90vw, 340px"
          />
        ) : (
          <div
            className={`${styles.slidePlaceholder} ${
              isAILodge ? styles.placeholderAI : styles.placeholderDAP
            }`}
          />
        )}
      </div>

      <span
        className={`${styles.badge} ${
          isAILodge ? styles.badgeAI : styles.badgeDAP
        }`}
      >
        {project.badge}
      </span>

      <div className={styles.slideBody}>
        <h3 className={styles.slideTitle}>{project.title}</h3>
        <p className={styles.slideDescription}>{project.description}</p>
      </div>
    </Link>
  );
}

/**
 * Auto-scrolling, seamlessly looping horizontal rail of project posters.
 * Shared by the Projects hero and the home page teaser strip.
 */
export default function ProjectsMarquee({
  projects,
  fadeLeft,
  fadeRight,
  mobileFocused = false,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // WCAG 2.2.2: moving content needs a way to pause it
  const [userPaused, setUserPaused] = useState(false);

  // Repeat the list enough to comfortably exceed the viewport, then render three
  // copies. We start scrolled into the middle copy and wrap by one copy-width in
  // either direction, so the autoscroll — and manual scrolling — loop seamlessly.
  const MIN_SLIDES = 6;
  const reps =
    projects.length > 0
      ? Math.max(1, Math.ceil(MIN_SLIDES / projects.length))
      : 0;
  const base = Array.from({ length: reps }, () => projects).flat();
  const track = base.length > 0 ? [...base, ...base, ...base] : [];
  const autoscroll = !reduceMotion && !userPaused;
  const autoscrollRef = useRef(autoscroll);
  const syncRef = useRef<() => void>();

  useEffect(() => {
    autoscrollRef.current = autoscroll;
    syncRef.current?.();
  }, [autoscroll]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || base.length === 0) return;

    const SPEED =
      mobileFocused && window.matchMedia("(max-width: 639px)").matches
        ? 12
        : 42;
    let copyWidth = 0;
    let frame = 0;
    let lastTimestamp: number | null = null;
    let grabbed = false;
    let focused = false;
    let onScreen = false;
    let resumeTimer = 0;

    const wrapIntoMiddleCopy = () => {
      if (!copyWidth) return;

      while (vp.scrollLeft >= copyWidth * 2) vp.scrollLeft -= copyWidth;
      while (vp.scrollLeft < copyWidth) vp.scrollLeft += copyWidth;
    };

    const measure = () => {
      const previousWidth = copyWidth;
      const progress = previousWidth
        ? (vp.scrollLeft - previousWidth) / previousWidth
        : 0;

      copyWidth = vp.scrollWidth / 3;
      vp.scrollLeft = copyWidth * (1 + Math.max(0, Math.min(progress, 1)));
      lastTimestamp = null;
    };

    const tick = (timestamp: number) => {
      if (lastTimestamp !== null) {
        const elapsedSeconds = Math.min(timestamp - lastTimestamp, 64) / 1000;
        vp.scrollLeft += SPEED * elapsedSeconds;
        wrapIntoMiddleCopy();
      }
      lastTimestamp = timestamp;
      frame = window.requestAnimationFrame(tick);
    };

    // Only run the frame loop while it can actually be seen and nobody is
    // holding or keyboard-browsing the rail. Mobile scroll-snap is switched
    // off while it runs, otherwise the browser re-snaps every frame and the
    // programmatic scroll fights it (stutter / stalls on phones).
    const sync = () => {
      const shouldRun =
        autoscrollRef.current && onScreen && !grabbed && !focused && !document.hidden;
      vp.dataset.autoscroll = shouldRun ? "on" : "off";
      if (shouldRun && !frame) {
        lastTimestamp = null;
        frame = window.requestAnimationFrame(tick);
      } else if (!shouldRun && frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    measure();
    syncRef.current = sync;

    const grab = () => {
      window.clearTimeout(resumeTimer);
      resumeTimer = 0;
      grabbed = true;
      sync();
    };
    const release = () => {
      if (!grabbed) return;
      window.clearTimeout(resumeTimer);
      // Let touch momentum and snapping settle before taking over again
      resumeTimer = window.setTimeout(() => {
        wrapIntoMiddleCopy();
        grabbed = false;
        sync();
      }, RESUME_AFTER_MS);
    };
    const onScroll = () => {
      if (grabbed && resumeTimer) release();
    };
    const onFocusIn = () => {
      focused = true;
      sync();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (vp.contains(event.relatedTarget as Node | null)) return;
      focused = false;
      sync();
    };

    const resizeObserver = new ResizeObserver(measure);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });

    vp.addEventListener("pointerdown", grab);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    vp.addEventListener("scroll", onScroll, { passive: true });
    vp.addEventListener("focusin", onFocusIn);
    vp.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", sync);
    resizeObserver.observe(vp);
    visibilityObserver.observe(vp);

    return () => {
      syncRef.current = undefined;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(resumeTimer);
      vp.removeEventListener("pointerdown", grab);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      vp.removeEventListener("scroll", onScroll);
      vp.removeEventListener("focusin", onFocusIn);
      vp.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", sync);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [base.length, mobileFocused]);

  if (track.length === 0) return null;

  // Only the first run of real projects in the middle copy is exposed to
  // screen readers and keyboard users; everything else is a visual loop copy.
  const firstAccessible = base.length;
  const lastAccessible = base.length + projects.length;

  return (
    <div
      className={`${styles.marquee} ${
        mobileFocused ? styles.mobileFocused : ""
      }`}
      style={
        {
          "--fade-l": fadeLeft,
          "--fade-r": fadeRight,
        } as CSSProperties
      }
    >
      <div className={styles.viewport} ref={viewportRef}>
        <div className={styles.track}>
          {track.map((project, i) => (
            <MarqueeSlide
              key={`${project.slug}-${i}`}
              project={project}
              duplicate={i < firstAccessible || i >= lastAccessible}
            />
          ))}
        </div>
      </div>
      <div className={styles.fadeLeft} aria-hidden="true" />
      <div className={styles.fadeRight} aria-hidden="true" />
      {!reduceMotion && (
        <button
          type="button"
          className={styles.pauseButton}
          onClick={() => setUserPaused((paused) => !paused)}
          aria-label={
            userPaused ? "Resume project scrolling" : "Pause project scrolling"
          }
        >
          {userPaused ? (
            <Play size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Pause size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
