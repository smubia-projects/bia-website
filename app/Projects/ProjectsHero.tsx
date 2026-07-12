"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./ProjectsHero.module.css";
import { Project } from "@/app/Projects/data/types";

interface Props {
  projects: Project[];
}

function HeroSlide({ project }: { project: Project }) {
  const image = project.coverImage || project.images.find(Boolean) || "";
  const isAILodge = project.badge === "AI Lodge";
  const builder = project.team.map((m) => m.name).filter(Boolean)[0];
  const tech = project.techStack.slice(0, 3).join("  ·  ");

  return (
    <Link
      href={`/Projects/${project.slug}`}
      className={styles.slide}
      aria-label={`${project.title} — ${project.badge}`}
    >
      <div className={styles.slideMedia}>
        {image ? (
          <Image
            src={image}
            alt={project.title}
            fill
            className={styles.slideImg}
            sizes="440px"
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
        <h2 className={styles.slideTitle}>{project.title}</h2>
        <span className={styles.slideMeta}>
          {[builder, tech].filter(Boolean).join("  ·  ")}
        </span>
      </div>
    </Link>
  );
}

export default function ProjectsHero({ projects }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);

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

    let copyWidth = vp.scrollWidth / 3;
    // Begin in the middle copy so there's a full copy of runway on each side.
    vp.scrollLeft = copyWidth;

    let paused = false;
    let last = performance.now();
    let raf = 0;
    const SPEED = 42; // px per second — a calm, readable drift

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!paused) vp.scrollLeft += SPEED * dt;
      // Keep the scroll position within the middle copy for a seamless loop.
      if (vp.scrollLeft >= copyWidth * 2) vp.scrollLeft -= copyWidth;
      else if (vp.scrollLeft <= 0) vp.scrollLeft += copyWidth;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    // Only pause while the user is actively grabbing/dragging the rail — never
    // on plain hover — so it always visibly autoscrolls.
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    const remeasure = () => (copyWidth = vp.scrollWidth / 3);

    vp.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    window.addEventListener("resize", remeasure);

    return () => {
      cancelAnimationFrame(raf);
      vp.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      window.removeEventListener("resize", remeasure);
    };
  }, [base.length]);

  return (
    <section className={styles.hero} aria-label="Projects showcase">
      <div className={styles.intro}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Projects</span>
        </div>
        <h1 className={styles.heading}>
          Built at <span className={styles.headingAccent}>SMUBIA</span>
        </h1>
      </div>

      {track.length > 0 && (
        <div className={styles.marquee}>
          <div className={styles.viewport} ref={viewportRef}>
            <div className={styles.track}>
              {track.map((project, i) => (
                <HeroSlide key={`${project.slug}-${i}`} project={project} />
              ))}
            </div>
          </div>
          <div className={styles.fadeLeft} aria-hidden="true" />
          <div className={styles.fadeRight} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
