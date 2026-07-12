"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./ProjectsHero.module.css";
import { Project } from "@/app/Projects/data/types";

interface Props {
  projects: Project[];
}

/** Strip the handful of inline markdown tokens our articles use. */
function stripInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/**
 * Pull an editorial hook for the hero — the punchy opening line of the project's
 * article (these tend to lead with a question, e.g. "What if you could be the
 * main character of your own story?"), falling back to the short description.
 * Robust for projects with neither: returns "".
 */
function extractHook(project: Project): string {
  const source = project.article?.trim() || project.description?.trim() || "";
  if (!source) return "";
  const firstLine =
    source
      .split(/\n{2,}/)[0]
      .split(/\n/)
      .find((l) => l.trim().length > 0) || "";
  const clean = stripInline(firstLine);
  const sentence = clean.match(/^.*?[.?!](?=\s|$)/);
  let hook = (sentence ? sentence[0] : clean).trim();
  if (hook.length > 128) {
    // Cut at a word boundary — never mid-word — and shed trailing punctuation.
    hook = hook.slice(0, 125).replace(/\s+\S*$/, "").replace(/[\s—–,;:-]+$/, "") + "…";
  }
  return hook;
}

function HeroSlide({ project }: { project: Project }) {
  const image = project.coverImage || project.images.find(Boolean) || "";
  const isAILodge = project.badge === "AI Lodge";
  const hook = extractHook(project);
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
        {builder && (
          <span className={styles.credit}>{builder}</span>
        )}
        <h2 className={styles.slideTitle}>{project.title}</h2>
        {hook && <p className={styles.hook}>{hook}</p>}
        {tech && <span className={styles.tech}>{tech}</span>}
      </div>
    </Link>
  );
}

export default function ProjectsHero({ projects }: Props) {
  // Repeat the list enough to comfortably span a wide viewport, then duplicate
  // that base once more so the -50% CSS loop is seamless. This lets the marquee
  // autoscroll infinitely no matter how few projects exist.
  const MIN_SLIDES = 8;
  const reps =
    projects.length > 0
      ? Math.max(2, Math.ceil(MIN_SLIDES / projects.length))
      : 0;
  const base = Array.from({ length: reps }, () => projects).flat();
  const track = [...base, ...base];
  // Scale the duration to the track width so the pixel speed stays roughly
  // constant regardless of how many slides we ended up with.
  const duration = `${Math.max(base.length * 6, 30)}s`;

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
          <div className={styles.track} style={{ animationDuration: duration }}>
            {track.map((project, i) => (
              <HeroSlide key={`${project.slug}-${i}`} project={project} />
            ))}
          </div>
          <div className={styles.fadeLeft} aria-hidden="true" />
          <div className={styles.fadeRight} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
