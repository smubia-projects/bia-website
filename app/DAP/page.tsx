import React from "react";
import Image from "next/image";
import styles from "./DAP.module.css";
import ScrollReveal from "../components/ui/ScrollReveal";
import Button from "../components/ui/Button";
import { LINKS } from "../lib/links";
import { MotionAnchor, MotionNextLink } from "../components/ui/MotionElements";
import {
  CURRICULUM,
  COHORT_PHOTO,
  STRUCTURE,
} from "./data";

export const metadata = {
  title: "Data Associate Programme — SMUBIA",
  description:
    "SMUBIA's flagship programme. A selective cohort spends a semester learning the machine learning core and shipping a real project, mentored throughout.",
};

export default function DAPPage() {
  return (
    <main className={styles.page}>
      {/* ── Hero — typographic, deep pine ───────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Data Associate Programme</p>
          <h1 className={styles.heroTitle}>
            Machine learning,
            <br />
            built — not memorised.
          </h1>
          <p className={styles.heroLede}>
            SMUBIA&apos;s flagship programme. A selective cohort spends a
            semester learning the machine learning core and shipping a real
            project — mentored from first idea to final showcase.
          </p>
          <div className={styles.heroActions}>
            <Button href={LINKS.dapTelegram} variant="onDark" external>
              Apply to the programme →
            </Button>
            <MotionAnchor
              href="#curriculum"
              className={styles.heroScrollLink}
              hover={{ y: -2, color: "var(--mint)" }}
            >
              See the curriculum ↓
            </MotionAnchor>
          </div>
        </div>
      </section>

      {/* ── The programme ───────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>The programme</p>
              <p className={styles.introText}>
                DAP is application-based. Rather than sit through lectures,
                associates learn the way the field is practised — in small
                teams, teaching the theory to one another and building a
                project of their own alongside it, mentors beside them the
                whole way.
              </p>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* ── Curriculum — the centrepiece ────────────────────────── */}
      <section id="curriculum" className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.curriculumHead}>
              <p className={styles.eyebrow}>AY 26/27 curriculum</p>
              <h2 className={styles.sectionTitle}>The machine learning core</h2>
              <p className={styles.sectionLede}>
                Nine topics across one semester — each taken deep by a team and
                taught back to the cohort. Together they map the essentials of
                modern machine learning.
              </p>
            </div>
          </ScrollReveal>

          <ol className={styles.curriculum}>
            {CURRICULUM.map((topic, i) => (
              <ScrollReveal key={topic.title} delay={Math.min(i, 4) * 40}>
                <li className={styles.curriculumRow}>
                  <span className={styles.curriculumNum}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={styles.curriculumTitle}>{topic.title}</h3>
                  <p className={styles.curriculumBlurb}>{topic.blurb}</p>
                </li>
              </ScrollReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Cohort photo — the wide moment ──────────────────────── */}
      <section className={styles.cohortSection}>
        <div className={styles.cohortInner}>
          <ScrollReveal>
            <figure className={styles.cohortFigure}>
              <div className={styles.cohortFrame}>
                <Image
                  src={COHORT_PHOTO.src}
                  alt={COHORT_PHOTO.caption}
                  fill
                  sizes="(min-width: 1024px) 72rem, 100vw"
                  className={styles.cohortImage}
                />
              </div>
              <figcaption className={styles.cohortCaption}>
                {COHORT_PHOTO.caption}
              </figcaption>
            </figure>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Programme structure — two movements ─────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.curriculumHead}>
              <p className={styles.eyebrow}>How it runs</p>
              <h2 className={styles.sectionTitle}>
                Two things happen every week
              </h2>
            </div>
          </ScrollReveal>

          <div className={styles.movements}>
            {STRUCTURE.map((movement) => (
              <ScrollReveal key={movement.label}>
                <article className={styles.movement}>
                  <div className={styles.movementText}>
                    <p className={styles.movementLabel}>{movement.label}</p>
                    <h3 className={styles.movementTitle}>{movement.title}</h3>
                    <p className={styles.movementBlurb}>{movement.blurb}</p>
                  </div>
                  <div className={styles.movementPhotos}>
                    {movement.photos.map((photo) => (
                      <div key={photo.src} className={styles.exhibit}>
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          fill
                          sizes="(min-width: 1024px) 24rem, 45vw"
                          className={styles.exhibitImage}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing — quiet CTA band ────────────────────────────── */}
      <section className={styles.closing}>
        <div className={styles.closingGlow} aria-hidden="true" />
        <div className={styles.closingInner}>
          <ScrollReveal>
            <h2 className={styles.closingTitle}>Applications open each semester.</h2>
            <p className={styles.closingText}>
              No prior machine learning experience needed — only commitment.
            </p>
            <div className={styles.closingActions}>
              <Button
                href={LINKS.dapTelegram}
                variant="onDark"
                className="gleam"
                external
              >
                Apply to the programme →
              </Button>
            </div>
            <MotionNextLink
              href="/Projects?badge=DAP"
              className={styles.closingLink}
              hover={{ x: 3, color: "var(--mint)" }}
            >
              See what associates built →
            </MotionNextLink>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
