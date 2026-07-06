"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./ProjectsHero.module.css";
import { Project } from "@/app/Projects/data/types";

interface Props {
  projects: Project[];
}

function HeroCard({ project }: { project: Project }) {
  const image = project.coverImage || project.images.find(Boolean) || "";
  const isAILodge = project.badge === "AI Lodge";

  return (
    <Link
      href={`/Projects/${project.slug}`}
      className={styles.card}
      aria-label={`${project.title} — ${project.badge}`}
    >
      <div className={styles.cardImage}>
        {image ? (
          <Image
            src={image}
            alt={project.title}
            fill
            className={styles.cardImg}
            sizes="320px"
          />
        ) : (
          <div
            className={`${styles.cardPlaceholder} ${
              isAILodge ? styles.placeholderAI : styles.placeholderDAP
            }`}
          >
            {project.title.charAt(0)}
          </div>
        )}
        <div className={styles.cardOverlay} />
        <span
          className={`${styles.cardBadge} ${
            isAILodge ? styles.badgeAI : styles.badgeDAP
          }`}
        >
          {project.badge}
        </span>
        <span className={styles.cardTitle}>{project.title}</span>
      </div>
    </Link>
  );
}

export default function ProjectsHero({ projects }: Props) {
  if (projects.length === 0) return null;

  // Repeat the base list so the strip is wide enough to scroll continuously
  // even with only a couple of projects, then duplicate the whole track once
  // more so the CSS marquee can loop seamlessly at -50%.
  let base = projects;
  while (base.length < 6) {
    base = [...base, ...projects];
  }
  const track = [...base, ...base];

  return (
    <section className={styles.hero} aria-label="Featured projects">
      <div className={styles.marquee}>
        <div className={styles.track}>
          {track.map((project, i) => (
            <HeroCard key={`${project.slug}-${i}`} project={project} />
          ))}
        </div>
      </div>
      <div className={styles.fadeLeft} aria-hidden="true" />
      <div className={styles.fadeRight} aria-hidden="true" />
    </section>
  );
}
