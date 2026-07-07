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
      {/* Section label + filter bar (the hero above owns the page H1) */}
      <div className={styles.gridIntro}>
        <div>
          <span className="eyebrow">The catalog</span>
          <h2 className={styles.gridLabel}>All projects</h2>
        </div>
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
