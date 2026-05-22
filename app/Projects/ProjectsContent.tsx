"use client";

import { useState, useMemo } from "react";
import styles from "./Projects.module.css";
import ProjectCard from "@/app/components/ProjectCard";
import Divider from "@/app/components/divider";
import { Project } from "@/app/Projects/data/types";

const ALL = "All";

interface Props {
  projects: Project[];
}

export default function ProjectsContent({ projects }: Props) {
  const [activeFilter, setActiveFilter] = useState<string>(ALL);

  const filters = useMemo(() => {
    const badges = Array.from(new Set(projects.map((p) => p.badge)));
    return [ALL, ...badges];
  }, [projects]);

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
          <span className={styles.eyebrowText}>Portfolio Showcase</span>
        </div>
        <h1 className={styles.heading}>Project Showcase</h1>
        <p className={styles.subheading}>
          A collection of past projects from previous batches of Data
          Associates &amp; AI Lodgers
        </p>
      </header>

      <Divider />

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

      <Divider />

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaBox}>
          <h2 className={styles.ctaHeading}>Have a project in mind?</h2>
          <p className={styles.ctaText}>
            Join our next DAP / AI Lodge intake and turn your ideas into
            reality!
          </p>
          <a href="/ContactUs" className={styles.ctaButton}>
            Apply Now →
          </a>
        </div>
      </section>
    </>
  );
}
