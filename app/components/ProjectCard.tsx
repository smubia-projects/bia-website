"use client";
import Link from "next/link";
import Image from "next/image";
import styles from "./ProjectCard.module.css";
import { Project } from "@/app/Projects/data/types";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const isAILodge = project.badge === "AI Lodge";

  return (
    <Link href={`/Projects/${project.slug}`} className={styles.cardLink}>
      <div className={styles.card}>
        <div className={styles.imageWrapper}>
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className={styles.body}>
          <div className={styles.meta}>
            <span className={isAILodge ? styles.badgeAI : styles.badgeDAP}>
              {project.badge}
            </span>
            <span className={styles.category}>{project.category}</span>
          </div>
          <h3 className={styles.title}>{project.title}</h3>
          <p className={styles.description}>{project.description}</p>
          <div className={styles.cta}>
            <span>View Case Study</span>
            <span className={styles.ctaArrow}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
