"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./ProjectDetail.module.css";
import { Linkedin, Github, Globe } from "lucide-react";
import { Project, TeamMember, HighlightCard } from "@/app/Projects/data/types";
import { getCardIcon } from "@/app/Projects/data/cardIcons";
import Markdown from "@/app/components/ui/Markdown";

interface Props {
  project: Project;
}

const GithubIcon = () => (
  <svg
    className={styles.githubIcon}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

/**
 * Prefer the flexible `cards` array; fall back to migrating legacy `lessons`
 * so projects saved before the change still render their two fixed cards.
 */
function resolveCards(project: Project): HighlightCard[] {
  if (project.cards && project.cards.length > 0) {
    return project.cards.filter((c) => c.title?.trim() || c.body?.trim());
  }
  const legacy: HighlightCard[] = [];
  if (project.lessons?.satisfaction?.trim()) {
    legacy.push({
      icon: "circle-check",
      title: "Project Satisfaction",
      body: project.lessons.satisfaction,
    });
  }
  if (project.lessons?.takeaway?.trim()) {
    legacy.push({
      icon: "lightbulb",
      title: "Key Takeaway",
      body: project.lessons.takeaway,
    });
  }
  return legacy;
}

function TeamSocials({ member }: { member: TeamMember }) {
  const links = [
    { href: member.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: member.github, label: "GitHub", Icon: Github },
    { href: member.website, label: "Website", Icon: Globe },
  ].filter((l) => l.href && l.href.trim().length > 0);

  if (links.length === 0) return null;

  return (
    <div className={styles.memberSocials}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.memberSocialLink}
          aria-label={`${member.name} on ${label}`}
        >
          <Icon size={16} strokeWidth={2} aria-hidden />
        </a>
      ))}
    </div>
  );
}

export default function ProjectDetailContent({ project }: Props) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const images = project.images.filter(Boolean);
  const hasImages = images.length > 0;
  const isAILodge = project.badge === "AI Lodge";
  // "Try it live" prefers the new liveUrl, falling back to the legacy demoUrl.
  const liveUrl = project.liveUrl || project.demoUrl;
  // Project Details is one markdown field now. Legacy records still carry a
  // separate `rationale`; fold it in so nothing written before the merge is lost.
  const detailsMarkdown = [project.overview, project.rationale]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join("\n\n");
  const cards = resolveCards(project);

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
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/Projects" className={styles.breadcrumbLink}>
          Projects
        </Link>
        <span className={styles.breadcrumbSep}>›</span>
        <span className={styles.breadcrumbCurrent}>{project.title}</span>
      </nav>

      {/* Header — title + description on the left, actions on the right,
          sitting above the image (see reference layout) */}
      <header className={styles.showcaseHeader}>
        <div className={styles.headerText}>
          <div className={styles.showcaseEyebrow}>
            <span className={isAILodge ? styles.badgeAI : styles.badgeDAP}>
              {project.badge}
            </span>
            {project.category && (
              <>
                <span className={styles.eyebrowDot} aria-hidden />
                <span className={styles.category}>{project.category}</span>
              </>
            )}
          </div>
          <h1 className={styles.title}>{project.title}</h1>
          <p className={styles.description}>{project.description}</p>
        </div>

        {(liveUrl || project.sourceUrl) && (
          <div className={styles.actions}>
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtnPrimary}
              >
                Try it live
                <span className={styles.actionIcon}>↗</span>
              </a>
            )}
            {project.sourceUrl && (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                <GithubIcon />
                GitHub
              </a>
            )}
          </div>
        )}
      </header>

      {/* Showcase carousel — skipped entirely when there are no images */}
      {hasImages && (
        <section className={styles.carouselSection}>
          <div className={styles.carouselWrapper}>
            <div className={styles.carousel} ref={carouselRef}>
              {images.map((src, i) => (
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
            {images.length > 1 && (
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
      )}

      {/* Main column (details + lessons) beside the team/meta sidebar */}
      <div className={styles.contentGrid}>
        <div className={styles.mainContent}>
            {detailsMarkdown && (
              <section className={styles.overviewSection}>
                <div className={styles.sectionDivider}>
                  <div className={styles.dividerLine} />
                  <h2 className={styles.sectionLabel}>Project Details</h2>
                  <div className={styles.dividerLineShort} />
                </div>
                <Markdown content={detailsMarkdown} />
              </section>
            )}

            {cards.length > 0 && (
              <section className={styles.cardsGrid}>
                {cards.map((card, i) => {
                  const Icon = getCardIcon(card.icon);
                  return (
                    <div key={i} className={styles.card}>
                      <div className={styles.cardHead}>
                        <span className={styles.cardIcon}>
                          <Icon size={18} strokeWidth={2.25} aria-hidden />
                        </span>
                        {card.title && (
                          <h3 className={styles.cardTitle}>{card.title}</h3>
                        )}
                      </div>
                      {card.body && (
                        <Markdown variant="compact" content={card.body} />
                      )}
                    </div>
                  );
                })}
              </section>
            )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            {project.team.length > 0 && (
              <>
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
                      <div className={styles.memberInfo}>
                        <p className={styles.memberName}>{member.name}</p>
                        <p className={styles.memberRole}>{member.role}</p>
                        <TeamSocials member={member} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className={styles.metaSection}>
              {project.programme && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Programme</span>
                  <span className={styles.metaValue}>{project.programme}</span>
                </div>
              )}
              {project.techStack.length > 0 && (
                <div className={styles.sidebarTech}>
                  {project.techStack.map((tech) => (
                    <span key={tech} className={styles.techTag}>
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
