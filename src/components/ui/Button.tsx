"use client";

import React from "react";
import Link from "next/link";
import { motion, type TargetAndTransition } from "framer-motion";
import styles from "./Button.module.css";
import { MOTION_EASE } from "./motion";

type Variant = "primary" | "onDark" | "outline" | "outlineOnDark";

const MotionLink = motion.create(Link);

const hoverByVariant: Record<Variant, TargetAndTransition> = {
  primary: {
    y: -2,
    backgroundColor: "var(--emerald-strong)",
    boxShadow: "var(--shadow-md)",
  },
  onDark: {
    y: -2,
    backgroundColor: "#92e0ce",
    boxShadow:
      "0 0 0 3px rgba(125, 215, 194, 0.16), 0 8px 36px -2px rgba(125, 215, 194, 0.55)",
  },
  outline: {
    y: -2,
    color: "var(--emerald)",
    borderColor: "var(--emerald)",
    backgroundColor: "rgba(125, 215, 194, 0.12)",
    boxShadow: "var(--shadow-md)",
  },
  outlineOnDark: {
    y: -2,
    color: "var(--mint)",
    borderColor: "var(--mint)",
    backgroundColor: "rgba(125, 215, 194, 0.08)",
    boxShadow: "var(--shadow-md)",
  },
};

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
  const hasGleam = className.split(" ").includes("gleam");
  const motionProps = {
    initial: "rest",
    animate: "rest",
    whileHover: "hover",
    whileFocus: "hover",
    whileTap: "tap",
    variants: {
      rest: { y: 0 },
      hover: hoverByVariant[variant],
      tap: { y: 0, scale: 0.98 },
    },
    transition: { duration: 0.25, ease: MOTION_EASE },
  } as const;

  const content = (
    <>
      <span className={styles.label}>{children}</span>
      {hasGleam && (
        <motion.span
          className={styles.gleamSweep}
          aria-hidden="true"
          variants={{ rest: { x: "-130%" }, hover: { x: "130%" } }}
          transition={{ duration: 0.7, ease: MOTION_EASE }}
        />
      )}
    </>
  );

  if (external) {
    return (
      <motion.a
        href={href}
        className={cls}
        target="_blank"
        rel="noopener noreferrer"
        {...motionProps}
      >
        {content}
      </motion.a>
    );
  }
  // mailto / anchors / downloads go through a plain <a> too
  if (href.startsWith("mailto:") || href.startsWith("#")) {
    return (
      <motion.a href={href} className={cls} {...motionProps}>
        {content}
      </motion.a>
    );
  }
  return (
    <MotionLink href={href} className={cls} {...motionProps}>
      {content}
    </MotionLink>
  );
}
