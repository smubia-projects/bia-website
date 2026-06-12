import React from "react";
import styles from "./SectionHeading.module.css";

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
}

export default function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "light",
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={`${styles.wrap} ${tone === "dark" ? styles.dark : ""} ${
        align === "center" ? styles.center : ""
      }`}
    >
      {eyebrow && (
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrowLine} />
          <span className={`eyebrow ${tone === "dark" ? "eyebrowOnDark" : ""}`}>
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className={styles.title}>{title}</h2>
      {lede && <p className={styles.lede}>{lede}</p>}
    </div>
  );
}
