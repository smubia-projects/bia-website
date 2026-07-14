"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import styles from "./ProjectCard.module.css";
import { Project } from "@/app/Projects/data/types";
import { MOTION_EASE } from "./ui/motion";

const MotionLink = motion.create(Link);
const MotionImage = motion.create(Image);

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const isAILodge = project.badge === "AI Lodge";

  return (
    <MotionLink
      href={`/Projects/${project.slug}`}
      className={styles.cardLink}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      whileTap={{ scale: 0.99 }}
    >
      <motion.div
        className={`${styles.card} ${
          isAILodge ? styles.cardAI : styles.cardDAP
        }`}
        variants={{
          rest: { y: 0 },
          hover: {
            y: -3,
            borderColor: isAILodge
              ? "rgba(184, 134, 11, 0.62)"
              : "rgba(14, 124, 91, 0.6)",
            boxShadow: isAILodge
              ? "0 0 0 1px rgba(184, 134, 11, 0.3), 0 16px 42px -14px rgba(184, 134, 11, 0.58)"
              : "0 0 0 1px rgba(14, 124, 91, 0.28), 0 16px 42px -14px rgba(14, 124, 91, 0.6)",
          },
        }}
        transition={{ duration: 0.3, ease: MOTION_EASE }}
      >
        <div className={styles.imageWrapper}>
          <MotionImage
            src={project.coverImage}
            alt={project.title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 50vw"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
            transition={{ duration: 0.5, ease: MOTION_EASE }}
          />
        </div>
        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={isAILodge ? styles.badgeAI : styles.badgeDAP}>
              {project.badge}
            </span>
            <span className={styles.category}>{project.category}</span>
          </div>
          <motion.h3
            className={styles.title}
            variants={{
              rest: { color: "var(--ink)" },
              hover: { color: "var(--emerald)" },
            }}
            transition={{ duration: 0.2, ease: MOTION_EASE }}
          >
            {project.title}
          </motion.h3>
          <p className={styles.description}>{project.description}</p>
        </div>
      </motion.div>
    </MotionLink>
  );
}
