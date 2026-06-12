import React from "react";
import Link from "next/link";
import styles from "./Button.module.css";

type Variant = "primary" | "onDark" | "outline" | "outlineOnDark";

interface ButtonProps {
  href: string;
  variant?: Variant;
  children: React.ReactNode;
  /** Open in a new tab (external links) */
  external?: boolean;
  className?: string;
}

export default function Button({
  href,
  variant = "primary",
  children,
  external = false,
  className = "",
}: ButtonProps) {
  const cls = `${styles.button} ${styles[variant]} ${className}`;

  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  // mailto / anchors / downloads go through a plain <a> too
  if (href.startsWith("mailto:") || href.startsWith("#")) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
