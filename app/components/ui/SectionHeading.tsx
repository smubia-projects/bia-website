import React from "react";
import styles from "./SectionHeading.module.css";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
  /** "hero" renders an h1 at page-hero scale; "section" (default) an h2. */
  size?: "section" | "hero";
}

export default function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "light",
  align = "left",
  size = "section",
}: SectionHeadingProps) {
  const Heading = size === "hero" ? "h1" : "h2";
  return (
    <div
      className={`${styles.wrap} ${tone === "dark" ? styles.dark : ""} ${
        align === "center" ? styles.center : ""
      } ${size === "hero" ? styles.hero : ""}`}
    >
      {eyebrow && (
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrowLine} />
          <span className={`eyebrow ${tone === "dark" ? "eyebrowOnDark" : ""}`}>
            {eyebrow}
          </span>
        </div>
      )}
      <Heading className={styles.title}>{title}</Heading>
      {lede && <p className={styles.lede}>{lede}</p>}
    </div>
  );
}
