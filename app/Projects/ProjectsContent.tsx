"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./Projects.module.css";
import ProjectCard from "@/app/components/ProjectCard";
import { Project } from "@/app/Projects/data/types";
import { MOTION_EASE, motionTransition } from "@/app/components/ui/motion";

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
      {/* The hero owns the page heading; filters lead directly into the grid. */}
      <div className={styles.gridIntro}>
        <div
          className={styles.filterBar}
          role="group"
          aria-label="Filter projects"
        >
          {filters.map((f) => (
            <motion.button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={styles.filterBtn}
              animate={{
                color: activeFilter === f ? "var(--emerald)" : "var(--ink-soft)",
                borderColor: activeFilter === f ? "var(--emerald)" : "var(--border)",
                backgroundColor:
                  activeFilter === f ? "rgba(125, 215, 194, 0.12)" : "var(--surface)",
              }}
              whileHover={{ color: "var(--emerald)", borderColor: "var(--emerald)" }}
              whileTap={{ scale: 0.96 }}
              transition={motionTransition.quick}
            >
              {f}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <motion.div className={styles.grid} layout>
        <AnimatePresence mode="popLayout">
          {filtered.map((project, index) => (
            <motion.div
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{
                duration: 0.3,
                delay: index * 0.035,
                ease: MOTION_EASE,
              }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {filtered.length === 0 && (
        <p className={styles.empty}>No projects found for this filter.</p>
      )}
    </>
  );
}
