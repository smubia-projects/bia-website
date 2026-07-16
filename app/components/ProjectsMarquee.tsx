"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import styles from "./ProjectsMarquee.module.css";
import { Project } from "@/app/Projects/data/types";
import { MOTION_EASE } from "./ui/motion";

const MotionLink = motion.create(Link);
const MotionImage = motion.create(Image);

interface Props {
  projects: Project[];
  /** Colour the left/right edge fades blend into (defaults to page --bg). */
  fadeLeft?: string;
  fadeRight?: string;
  /** Use the larger, slower, snap-aligned card treatment on mobile. */
  mobileFocused?: boolean;
}

function MarqueeSlide({ project }: { project: Project }) {
  const image = project.coverImage || project.images.find(Boolean) || "";
  const isAILodge = project.badge === "AI Lodge";

  return (
    <MotionLink
      href={`/Projects/${project.slug}`}
      className={styles.slide}
      aria-label={`${project.title} — ${project.badge}`}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      whileTap={{ scale: 0.99 }}
      variants={{
        rest: { y: 0, boxShadow: "var(--shadow-md)" },
        hover: { y: -5, boxShadow: "var(--shadow-lg)" },
      }}
      transition={{ duration: 0.35, ease: MOTION_EASE }}
    >
      <div className={styles.slideMedia}>
        {image ? (
          <MotionImage
            src={image}
            alt={project.title}
            fill
            className={styles.slideImg}
            sizes="440px"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
            transition={{ duration: 0.55, ease: MOTION_EASE }}
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
    </MotionLink>
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
    let paused = false;

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
      if (!paused && !document.hidden) {
        if (lastTimestamp !== null) {
          const elapsedSeconds = Math.min(timestamp - lastTimestamp, 64) / 1000;
          vp.scrollLeft += SPEED * elapsedSeconds;
          wrapIntoMiddleCopy();
        }
        lastTimestamp = timestamp;
      } else {
        lastTimestamp = null;
      }

      frame = window.requestAnimationFrame(tick);
    };

    measure();
    if (!reduceMotion) frame = window.requestAnimationFrame(tick);

    // Only pause while the user is actively grabbing/dragging the rail — never
    // on plain hover — so it always visibly autoscrolls.
    const pause = () => {
      paused = true;
    };
    const resume = () => {
      wrapIntoMiddleCopy();
      paused = false;
      lastTimestamp = null;
    };
    const resizeObserver = new ResizeObserver(measure);

    vp.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    resizeObserver.observe(vp);

    return () => {
      window.cancelAnimationFrame(frame);
      vp.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      resizeObserver.disconnect();
    };
  }, [base.length, mobileFocused, reduceMotion]);

  if (track.length === 0) return null;

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
            <MarqueeSlide key={`${project.slug}-${i}`} project={project} />
          ))}
        </div>
      </div>
      <div className={styles.fadeLeft} aria-hidden="true" />
      <div className={styles.fadeRight} aria-hidden="true" />
    </div>
  );
}
