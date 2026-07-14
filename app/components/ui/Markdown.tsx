import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import styles from "./Markdown.module.css";
import { MotionAnchor } from "./MotionElements";

/**
 * Shared markdown renderer for project copy (overview, lessons, story).
 *
 * Content is authored only through the admin panel (a trusted source), so we
 * render with react-markdown using:
 *  - remark-gfm    → tables, strikethrough, task lists, autolinks
 *  - remark-breaks → single newlines become <br>, so line breaks the author
 *                    typed render as they wrote them (CommonMark would collapse
 *                    them into spaces)
 * Raw HTML is NOT enabled (no rehype-raw), so there is no HTML-injection path.
 */

interface Props {
  content: string;
  className?: string;
  /** "compact" tightens type + spacing for small surfaces like lesson cards */
  variant?: "default" | "compact";
}

function MarkdownLink({
  href = "",
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = /^https?:\/\//.test(href);
  return (
    <MotionAnchor
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={rest.className}
      title={rest.title}
      hover={{ x: 1, color: "var(--emerald-strong)" }}
    >
      {children}
    </MotionAnchor>
  );
}

export default function Markdown({
  content,
  className,
  variant = "default",
}: Props) {
  return (
    <div
      className={[
        styles.prose,
        variant === "compact" ? styles.compact : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{ a: MarkdownLink }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
