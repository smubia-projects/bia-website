"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./Projects.module.css";
import ProjectCard from "@/app/components/ProjectCard";
import { Project } from "@/app/Projects/data/types";

const ALL = "All";

interface Props {
  projects: Project[];
}

export default function ProjectsContent({ projects }: Props) {
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const badges = Array.from(new Set(projects.map((p) => p.badge)));
    return [ALL, ...badges];
  }, [projects]);

  // Allow deep links like /Projects?badge=DAP; ignore unknown badges
  const requestedBadge = searchParams.get("badge");
  const initialFilter =
    requestedBadge && filters.includes(requestedBadge) ? requestedBadge : ALL;
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);

  const filtered = useMemo(() => {
    if (activeFilter === ALL) return projects;
    return projects.filter((p) => p.badge === activeFilter);
  }, [activeFilter, projects]);

  return (
    <>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowLine} />
          <span className={styles.eyebrowText}>Projects</span>
        </div>
        <h1 className={styles.heading}>Built at SMUBIA</h1>
        <p className={styles.subheading}>
          What our Data Associates and AI Lodgers shipped — from calorie bots to
          storybook generators.
        </p>
      </header>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`${styles.filterBtn} ${activeFilter === f ? styles.filterBtnActive : ""}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filtered.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className={styles.empty}>No projects found for this filter.</p>
      )}
    </>
  );
}
