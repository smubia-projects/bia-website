import Image from "next/image";
import { Github, Globe, Linkedin } from "lucide-react";
import type { HighlightCard, Project, TeamMember } from "@/app/Projects/data/types";
import { getCardIcon } from "@/app/Projects/data/cardIcons";
import Markdown from "@/app/components/ui/Markdown";
import Medal from "@/app/components/cms/Medal";
import ProjectCover from "@/app/components/cms/ProjectCover";
import ProjectTile from "@/app/components/cms/ProjectTile";
import ui from "@/app/components/cms/public.module.css";
import { BackPill, Carousel } from "./DetailClient";

interface Props {
  project: Project;
  related: Project[];
  relatedLabel: string;
}

/**
 * Prefer the flexible `cards` array; fall back to legacy `lessons` so records
 * written before the change still render their two fixed cards.
 */
function resolveCards(project: Project): HighlightCard[] {
  if (project.cards && project.cards.length > 0) {
    return project.cards.filter((c) => c.title?.trim() || c.body?.trim());
  }
  const legacy: HighlightCard[] = [];
  if (project.lessons?.satisfaction?.trim()) {
    legacy.push({ icon: "circle-check", title: "Project Satisfaction", body: project.lessons.satisfaction });
  }
  if (project.lessons?.takeaway?.trim()) {
    legacy.push({ icon: "lightbulb", title: "Key Takeaway", body: project.lessons.takeaway });
  }
  return legacy;
}

function MemberLinks({ member }: { member: TeamMember }) {
  const links = [
    { href: member.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: member.github, label: "GitHub", Icon: Github },
    { href: member.website, label: "Website", Icon: Globe },
  ].filter((l) => l.href?.trim());
  if (links.length === 0) return null;
  return (
    <span className={ui.memberLinks}>
      {links.map(({ href, label, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on ${label}`}>
          <Icon size={15} strokeWidth={2} aria-hidden />
        </a>
      ))}
    </span>
  );
}

export default function ProjectDetailContent({ project, related, relatedLabel }: Props) {
  const isDap = project.badge === "DAP";
  const winner = Boolean(project.winner) && !isDap;
  const images = project.images.filter(Boolean);
  const liveUrl = project.liveUrl || project.demoUrl;
  const cards = resolveCards(project);
  const details = [project.overview, project.rationale].map((s) => s?.trim()).filter(Boolean).join("\n\n");
  const fallback = isDap
    ? { href: "/DAP/projects", label: "DAP projects" }
    : project.cohortSlug
      ? { href: `/Projects/ai-lodge/${project.cohortSlug}`, label: "AI Lodge" }
      : { href: "/Projects", label: "all projects" };

  return (
    <div className={ui.detail}>
      <BackPill fallbackHref={fallback.href} fallbackLabel={fallback.label} />

      <div className={ui.detailCols}>
        <div className={ui.detailMain}>
          {images.length > 0 ? (
            <Carousel images={images} title={project.title} winner={winner} />
          ) : (
            <div className={`${ui.coverFrame} ${winner ? ui.coverWinner : ""}`}>
              <ProjectCover title={project.title} src={project.coverImage} aspect="16 / 9" monoSize={96} sizes="(max-width: 1200px) 100vw, 780px" />
            </div>
          )}

          <div className={ui.row}>
            <span className={`${ui.progBadge} ${isDap ? ui.progDap : ui.progLodge}`}>{project.badge}</span>
            {project.cohortName && <span className={ui.muted}>{project.cohortName}</span>}
          </div>

          {winner && (
            <div className={ui.winnerBanner}>
              <Medal size={30} />
              <span>
                Hack Day winner{project.trackName ? ` · ${project.trackName}` : ""}
              </span>
            </div>
          )}

          <h1 className={ui.detailTitle}>{project.title}</h1>
          {project.description && <p className={ui.detailDesc}>{project.description}</p>}

          {details && (
            <section className={ui.panel}>
              <h2 className={ui.panelTitle}>How it works</h2>
              <div className={ui.panelBody}>
                <Markdown content={details} />
              </div>
            </section>
          )}

          {cards.length > 0 && (
            <section className={ui.highlights} aria-label="Highlights">
              {cards.map((card, i) => {
                const Icon = getCardIcon(card.icon);
                return (
                  <div key={i} className={ui.highlight}>
                    <div className={ui.highlightHead}>
                      <span className={ui.highlightIcon}>
                        <Icon size={17} strokeWidth={2.25} aria-hidden />
                      </span>
                      {card.title && <h3 className={ui.highlightTitle}>{card.title}</h3>}
                    </div>
                    {card.body && <Markdown variant="compact" content={card.body} />}
                  </div>
                );
              })}
            </section>
          )}
        </div>

        <aside className={ui.detailAside}>
          <div className={ui.asidePanel}>
            {liveUrl && (
              <a className={ui.btn} href={liveUrl} target="_blank" rel="noopener noreferrer">
                Try it live
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
            )}
            {project.sourceUrl && (
              <a className={ui.pill} href={project.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ minHeight: 44 }}>
                View on GitHub
              </a>
            )}
            <dl className={ui.dl}>
              <dt>Programme</dt>
              <dd>{project.badge}</dd>
              {project.trackName && (
                <>
                  <dt>Track</dt>
                  <dd>{project.trackName}</dd>
                </>
              )}
              {project.madeFor && (
                <>
                  <dt>Made for</dt>
                  <dd>{project.madeFor}</dd>
                </>
              )}
              {project.builtWith && (
                <>
                  <dt>Built with</dt>
                  <dd>{project.builtWith}</dd>
                </>
              )}
            </dl>
            {project.team.length > 0 && (
              <ul className={ui.team} aria-label="Team">
                {project.team.map((m, i) => (
                  <li key={i} className={ui.member}>
                    <span className={ui.avatar}>
                      {m.avatar ? <Image src={m.avatar} alt="" fill sizes="40px" style={{ objectFit: "cover" }} /> : m.name.charAt(0)}
                    </span>
                    <span>
                      <p className={ui.memberName}>{m.name}</p>
                      {m.role && <p className={ui.memberRole}>{m.role}</p>}
                      <MemberLinks member={m} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {project.techStack.length > 0 && (
              <div className={ui.tags} aria-label="Tech stack">
                {project.techStack.map((t) => (
                  <span key={t} className={ui.tag}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className={ui.related}>
          <h2 className={ui.h2} style={{ fontSize: 22 }}>
            More from {relatedLabel}
          </h2>
          <div className={ui.relatedGrid}>
            {related.map((p) => (
              <ProjectTile key={p.slug} project={p} variant="related" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
