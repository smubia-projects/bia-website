"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./ProjectDetail.module.css";
import { Project } from "@/app/Projects/data/types";

interface Props {
  project: Project;
}

export default function ProjectDetailContent({ project }: Props) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "right" ? el.offsetWidth : -el.offsetWidth,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <nav className={styles.breadcrumb}>
              <Link href="/Projects" className={styles.breadcrumbLink}>
                Projects
              </Link>
              <span className={styles.breadcrumbSep}>›</span>
              <span className={styles.breadcrumbCurrent}>
                {project.title}
              </span>
            </nav>
            <h1 className={styles.title}>{project.title}</h1>
            <p className={styles.description}>{project.description}</p>
          </div>
          <div className={styles.actions}>
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                <span className={styles.actionIcon}>↗</span>
                Open Demo
              </a>
            )}
            {project.sourceUrl && (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                <svg
                  className={styles.githubIcon}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                >
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                Source Code
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Carousel */}
      <section className={styles.carouselSection}>
        <div className={styles.carouselWrapper}>
          <div className={styles.carousel} ref={carouselRef}>
            {project.images.map((src, i) => (
              <div key={i} className={styles.carouselItem}>
                <Image
                  src={src}
                  alt={`${project.title} screenshot ${i + 1}`}
                  fill
                  className={styles.carouselImage}
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>
            ))}
          </div>
          {project.images.length > 1 && (
            <>
              <button
                className={`${styles.carouselBtn} ${styles.carouselBtnLeft}`}
                onClick={() => scroll("left")}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                className={`${styles.carouselBtn} ${styles.carouselBtnRight}`}
                onClick={() => scroll("right")}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
        </div>
      </section>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        <div className={styles.mainContent}>
          <section className={styles.overviewSection}>
            <div className={styles.sectionDivider}>
              <div className={styles.dividerLine} />
              <h2 className={styles.sectionLabel}>Project Overview</h2>
              <div className={styles.dividerLineShort} />
            </div>
            <h3 className={styles.rationaleHeading}>Our Rationale</h3>
            <p className={styles.bodyText}>{project.overview}</p>
            <p className={styles.bodyText}>{project.rationale}</p>
          </section>

          <section className={styles.lessonsSection}>
            <div className={styles.lessonsHeader}>
              <h2 className={styles.lessonsTitle}>Lessons Learned</h2>
              <div className={styles.dividerLine} />
            </div>
            <div className={styles.lessonsGrid}>
              <div className={styles.lessonCard}>
                <div className={styles.lessonIconRow}>
                  <span className={styles.lessonIconTeal}>✓</span>
                  <h4 className={styles.lessonCardTitle}>
                    Project Satisfaction
                  </h4>
                </div>
                <p className={styles.lessonText}>
                  {project.lessons.satisfaction}
                </p>
              </div>
              <div className={styles.lessonCard}>
                <div className={styles.lessonIconRow}>
                  <span className={styles.lessonIconBlue}>💡</span>
                  <h4 className={styles.lessonCardTitle}>Key Takeaway</h4>
                </div>
                <p className={styles.lessonText}>
                  {project.lessons.takeaway}
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarLabel}>About the Team</h2>
            <ul className={styles.teamList}>
              {project.team.map((member, i) => (
                <li key={i} className={styles.teamMember}>
                  <div className={styles.avatarWrapper}>
                    {member.avatar ? (
                      <Image
                        src={member.avatar}
                        alt={member.name}
                        fill
                        className={styles.avatar}
                        sizes="48px"
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={styles.memberName}>{member.name}</p>
                    <p className={styles.memberRole}>{member.role}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className={styles.metaSection}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Programme</span>
                <span className={styles.metaValue}>
                  {project.programme}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Status</span>
                <span className={styles.statusBadge}>
                  {project.status}
                </span>
              </div>
              <div className={styles.techStack}>
                {project.techStack.map((tech) => (
                  <span key={tech} className={styles.techTag}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
