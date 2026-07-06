import React from "react";
import styles from "./page.module.css";

export const metadata = {
  title: "AI Lodge | SMUBIA",
  description:
    "AI Lodge — SMUBIA's fireside programme for building with AI. Full details coming soon.",
};

export default function AILodgePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Coming soon</span>
          <h1 className={styles.title}>AI Lodge</h1>
          <p className={styles.lede}>
            Pull up a chair by the fire — our 8-week programme for building with
            AI in tight-knit lodges is being rebuilt here. Full details are on
            the way.
          </p>
        </div>
      </section>
    </main>
  );
}
