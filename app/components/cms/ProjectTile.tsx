import Link from "next/link";
import type { Project } from "@/app/projects/data/types";
import { projectPath } from "@/app/lib/cms/paths";
import Medal from "./Medal";
import ProjectCover from "./ProjectCover";
import styles from "./public.module.css";

type Variant = "explorer" | "shelf" | "related";

interface Props {
  project: Project;
  variant?: Variant;
  /** Hack Day winners get the gold glow and medal only in the yearbook */
  showWinner?: boolean;
  /** The surrounding group already says what it was built with */
  hideBuiltWith?: boolean;
}

const COVER = {
  explorer: { mono: 44, sizes: "(max-width: 640px) 100vw, 300px" },
  shelf: { mono: 36, sizes: "(max-width: 640px) 100vw, 280px" },
  related: { mono: 32, sizes: "(max-width: 640px) 100vw, 260px" },
};

/** Project card used by the explorer, yearbook shelves and "More from" rows. */
export default function ProjectTile({ project, variant = "explorer", showWinner = false, hideBuiltWith = false }: Props) {
  const isDap = project.badge === "DAP";
  const winner = showWinner && Boolean(project.winner) && !isDap;
  const className = [
    styles.card,
    isDap ? styles.cardDap : styles.cardLodge,
    winner ? styles.cardWinner : "",
  ].join(" ");
  const label = `${project.title}${winner ? `, ${project.trackName ?? "track"} winner` : ""}`;

  return (
    <Link href={projectPath(project)} className={className} aria-label={label}>
      {winner && <Medal size={variant === "related" ? 34 : 46} className={styles.medalCorner} />}
      <ProjectCover
        title={project.title}
        src={project.coverImage}
        monoSize={COVER[variant].mono}
        sizes={COVER[variant].sizes}
      />
      {variant === "related" ? (
        <span className={styles.cardBody} style={{ padding: "12px 14px 16px" }}>
          <span className={styles.cardTitle} style={{ fontSize: 15 }}>
            {project.title}
          </span>
        </span>
      ) : (
        <span className={`${styles.cardBody} ${variant === "explorer" ? styles.cardBodyLarge : ""}`}>
          {variant === "explorer" && (
            <span className={styles.row}>
              <span className={`${styles.progBadge} ${isDap ? styles.progDap : styles.progLodge}`}>
                {project.badge}
              </span>
              {project.builtWith && <span className={styles.cardMeta}>{project.builtWith}</span>}
            </span>
          )}
          {variant === "shelf" && project.builtWith && !hideBuiltWith && (
            <span className={styles.cardMeta}>{project.builtWith}</span>
          )}
          {winner && <span className={styles.winnerTag}>{project.trackName ? `${project.trackName} winner` : "Track winner"}</span>}
          <span className={styles.cardTitle}>{project.title}</span>
          {project.description && <span className={styles.cardDesc}>{project.description}</span>}
        </span>
      )}
    </Link>
  );
}
