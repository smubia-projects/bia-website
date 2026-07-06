import type { ReactNode } from "react";
import styles from "./Markdown.module.css";

/**
 * Minimal, zero-dependency markdown renderer.
 *
 * Deliberately tiny: project articles are authored only through the admin panel
 * or the seed scripts (a trusted source), and they use just a handful of
 * constructs — paragraphs, `-`/`*` bullet lists, **bold**, `inline code`, and
 * [links](https://…). Pulling in react-markdown + remark would add a sizeable
 * transitive dependency tree for that small, controlled surface, so we parse it
 * by hand. Output is built from React nodes (no dangerouslySetInnerHTML), so
 * there is no raw-HTML injection path.
 */

interface Props {
  content: string;
  className?: string;
}

const INLINE = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(
        <code key={key++} className={styles.code}>
          {match[4]}
        </code>
      );
    } else if (match[6] !== undefined) {
      const href = match[7];
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <a
          key={key++}
          href={href}
          className={styles.link}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {match[6]}
        </a>
      );
    }
    lastIndex = INLINE.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export default function Markdown({ content, className }: Props) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className={`${styles.prose} ${className ?? ""}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length === 0) return null;

        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className={styles.list}>
              {lines.map((line, j) => (
                <li key={j} className={styles.listItem}>
                  {parseInline(line.replace(/^\s*[-*]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className={styles.paragraph}>
            {parseInline(lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}
