import React from "react";
import Image from "next/image";
import styles from "./DAP.module.css";
import ScrollReveal from "../components/ui/ScrollReveal";
import Button from "../components/ui/Button";
import { getSiteLinks } from "@/app/lib/cms/links";
import { getSitePhotos } from "@/app/lib/cms/photos";
import { pickPhoto } from "@/app/lib/photos";
import { getPublicCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { joinLink } from "@/app/lib/links";
import { MotionAnchor } from "../components/ui/MotionElements";
import { dapRunPath, yearbookPath } from "@/app/lib/cms/paths";
import RotatingHeadline from "../components/ui/RotatingHeadline";
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

export default async function DAPPage() {
  const [links, cohorts, photos] = await Promise.all([getSiteLinks(), getPublicCohorts("DAP"), getSitePhotos()]);
  const photoOf = (slot: string) => ({ slot, ...pickPhoto(photos, slot) });
  const cohortPhoto = photoOf(COHORT_PHOTO);
  const join = joinLink(links, "DAP");
  const cohort = pickCurrentCohort(cohorts);
  const runHref = cohort ? dapRunPath(cohort.slug) : null;
  return (
    <main className={styles.page}>
      {/* ── Hero — typographic, deep pine ───────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Data Associate Programme</p>
          <RotatingHeadline
            className={styles.heroTitle}
            headlines={[
              "Machine Learning built practically",
              "Co-Learning Community",
              "Guidance from experienced mentors",
            ]}
          />
          <p className={styles.heroLede}>
            SMUBIA&apos;s flagship programme. Data-Associates build projects in small teams, 
            and learn through teaching Machine Learning concepts to others.
          </p>
          <div className={styles.heroActions}>
            <Button href={join.href} variant="onDark" external>
              {join.open ? "Apply to the programme →" : "Get notified when applications open →"}
            </Button>
            {runHref && (
              <Button href={runHref} variant="outlineOnDark">
                This week in DAP →
              </Button>
            )}
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
                Application based. Instead of sitting through lectures and tests, associates will learn through
                building real projects while being guided by mentors. At the same time, they will further their 
                machine learning and data analytics knowledge through weekly Co-learning sessions, where they teach
                the curriculum to other associates.
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
                Nine topics across one semester. No pre-requisite knowledge required.
                Together they map the essentials of modern machine learning.
              </p>
            </div>
          </ScrollReveal>

          <ol className={styles.curriculum}>
            {CURRICULUM.map((topic, i) => (
              <ScrollReveal
                key={topic.title}
                as="li"
                className={styles.curriculumRow}
                delay={Math.min(i, 4) * 40}
              >
                <span className={styles.curriculumNum}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={styles.curriculumTitle}>{topic.title}</h3>
                <p className={styles.curriculumBlurb}>{topic.blurb}</p>
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
                  src={cohortPhoto.src}
                  alt={cohortPhoto.alt}
                  data-photo-slot={COHORT_PHOTO}
                  fill
                  sizes="(min-width: 1024px) 72rem, 100vw"
                  className={styles.cohortImage}
                />
              </div>
              <figcaption className={styles.cohortCaption}>
                {cohortPhoto.alt}
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
                Weekly Co-Learning Sessions and Guided Projects
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
                    {movement.photos.map((slot) => photoOf(slot)).map((photo) => (
                      <div key={photo.slot} className={styles.exhibit}>
                        <Image
                          src={photo.src}
                          alt={photo.alt}
                          data-photo-slot={photo.slot}
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

          {cohort && runHref && (
            <div className={styles.sectionFoot}>
              <Button href={runHref} variant="outlineOnDark">
                {cohort.name}: schedule and newsletter →
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ── Closing — quiet CTA band ────────────────────────────── */}
      <section className={styles.closing}>
        <div className={styles.closingGlow} aria-hidden="true" />
        <div className={styles.closingInner}>
          <ScrollReveal>
            <h2 className={styles.closingTitle}>Applications only open once a year</h2>
            <p className={styles.closingText}>
              No prior machine learning experience needed — only your full commitment.
            </p>
            <div className={styles.closingActions}>
              <Button
                href={join.href}
                variant="onDark"
                className="gleam"
                external
              >
                {join.open ? "Apply to the programme →" : "Get notified when applications open →"}
              </Button>
              <Button href={yearbookPath("DAP")} variant="outlineOnDark">
                See what associates built →
              </Button>
              {runHref && (
                <Button href={runHref} variant="outlineOnDark">
                  This week in DAP →
                </Button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
