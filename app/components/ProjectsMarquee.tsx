"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { animate, motion, useReducedMotion } from "framer-motion";
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
}

function MarqueeSlide({ project }: { project: Project }) {
  const image = project.coverImage || project.images.find(Boolean) || "";
  const isAILodge = project.badge === "AI Lodge";
  const builder = project.team.map((m) => m.name).filter(Boolean)[0];
  const tech = project.techStack.slice(0, 3).join("  ·  ");

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
        <div className={styles.slideScrim} />
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
        <span className={styles.slideMeta}>
          {[builder, tech].filter(Boolean).join("  ·  ")}
        </span>
      </div>
    </MotionLink>
  );
}

/**
 * Auto-scrolling, seamlessly looping horizontal rail of project posters.
 * Shared by the Projects hero and the home page teaser strip.
 */
export default function ProjectsMarquee({ projects, fadeLeft, fadeRight }: Props) {
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

    const SPEED = 42; // px per second — a calm, readable drift
    let controls: ReturnType<typeof animate> | null = null;

    const start = () => {
      controls?.stop();
      const copyWidth = vp.scrollWidth / 3;
      vp.scrollLeft = copyWidth;

      if (reduceMotion) return;

      controls = animate(0, copyWidth, {
        duration: copyWidth / SPEED,
        ease: "linear",
        repeat: Infinity,
        repeatType: "loop",
        onUpdate: (latest) => {
          vp.scrollLeft = copyWidth + latest;
        },
      });
    };
    start();

    // Only pause while the user is actively grabbing/dragging the rail — never
    // on plain hover — so it always visibly autoscrolls.
    const pause = () => controls?.pause();
    const resume = () => controls?.play();
    const remeasure = () => start();

    vp.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    window.addEventListener("resize", remeasure);

    return () => {
      controls?.stop();
      vp.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      window.removeEventListener("resize", remeasure);
    };
  }, [base.length, reduceMotion]);

  if (track.length === 0) return null;

  return (
    <div
      className={styles.marquee}
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
