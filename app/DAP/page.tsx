import React from "react";
import Image from "next/image";
import styles from "./DAP.module.css";
import ScrollReveal from "../components/ui/ScrollReveal";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import { LINKS } from "../lib/links";
import {
  PILLARS,
  CURRICULUM_TOPICS,
  FEATURED_PROJECTS,
  DAP_SLIDES_URL,
} from "./data";

export const metadata = {
  title: "Data Associate Programme — SMUBIA",
  description:
    "SMUBIA's flagship, application-based AI/ML programme. Around 50 associates per cohort learn machine learning through mentored, self-initiated projects.",
};

export default function DAPPage() {
  return (
    <main>
      {/* Hero (dark pine) */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowLine} />
            <span className="eyebrow eyebrowOnDark">
              Flagship Programme · Application-based
            </span>
          </div>
          <h1 className={styles.heroTitle}>Data Associate Programme</h1>
          <p className={styles.heroSub}>
            Our most sought-after programme. Each cohort, around 50 students
            are selected to spend a semester building a real machine learning
            project — in a team of four, with mentors beside you from first
            idea to final showcase.
          </p>
          <div className={styles.heroCtas}>
            <Button href={LINKS.joinForm} variant="onDark" external>
              Apply for the next cohort →
            </Button>
            <Button href={DAP_SLIDES_URL} variant="outlineOnDark" external>
              View the slide deck
            </Button>
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}>
              <strong>~50</strong> associates per cohort
            </span>
            <span className={styles.heroMetaItem}>
              teams of <strong>4</strong>
            </span>
            <span className={styles.heroMetaItem}>
              <strong>weekly</strong> theory sessions
            </span>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="The programme"
              title="Learn machine learning by shipping it"
              lede="DAP is a project-oriented learning programme: mentees learn through self-initiated projects in small groups, with weekly theory sessions in tandem. Through mentoring, we equip associates with real data science skills inside a co-learning community."
            />
          </ScrollReveal>
        </div>
      </section>

      {/* Three pillars */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="How it works"
              title="Three pillars"
            />
          </ScrollReveal>
          <div className={styles.pillarGrid}>
            {PILLARS.map((pillar, i) => (
              <ScrollReveal key={pillar.title} delay={i * 100}>
                <article className={styles.pillarCard}>
                  <div className={styles.pillarImageWrap}>
                    <Image
                      src={pillar.imageSrc}
                      alt={pillar.title}
                      fill
                      sizes="(min-width: 768px) 30vw, 90vw"
                      className={styles.pillarImage}
                    />
                  </div>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <ul className={styles.pillarList}>
                    {pillar.points.map((point) => (
                      <li key={point.lead}>
                        <strong>{point.lead}.</strong> {point.text}
                      </li>
                    ))}
                  </ul>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Curriculum"
              title="What you'll cover"
              lede="Each team takes a topic deep and teaches it back to the cohort — by the end of the semester you've covered the full machine learning core."
            />
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className={styles.topicGrid}>
              {CURRICULUM_TOPICS.map((topic, i) => (
                <div key={topic} className={styles.topicChip}>
                  <span className={styles.topicNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.topicName}>{topic}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured projects */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Highlights"
              title="Built by Data Associates"
              lede="A few of the projects past cohorts have taken from proposal to working demo."
            />
          </ScrollReveal>
          <div className={styles.projectList}>
            {FEATURED_PROJECTS.map((project, i) => (
              <ScrollReveal key={project.title}>
                <article
                  className={`${styles.projectRow} ${
                    i % 2 === 1 ? styles.projectRowReverse : ""
                  }`}
                >
                  <div className={styles.projectMedia}>
                    {project.media.type === "image" ? (
                      <Image
                        src={project.media.src}
                        alt={project.title}
                        fill
                        sizes="(min-width: 1024px) 45vw, 90vw"
                        className={styles.projectImage}
                      />
                    ) : (
                      <video
                        src={project.media.src}
                        className={styles.projectVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    )}
                  </div>
                  <div className={styles.projectBody}>
                    <h3 className={styles.projectTitle}>{project.title}</h3>
                    <p className={styles.projectMeta}>
                      <span>Team — {project.team}</span>
                      <span>
                        Mentor{project.mentors.includes(",") ? "s" : ""} —{" "}
                        {project.mentors}
                      </span>
                    </p>
                    <p className={styles.projectText}>{project.text}</p>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className={styles.projectsCta}>
              <Button href="/Projects?badge=DAP" variant="outline">
                Browse all DAP projects →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Application CTA (dark) */}
      <section className={styles.applyBand}>
        <div className={styles.applyGlow} aria-hidden="true" />
        <div className={styles.applyInner}>
          <ScrollReveal>
            <h2 className={styles.applyTitle}>
              Applications open each semester.
            </h2>
            <p className={styles.applyText}>
              Places are limited and demand keeps growing — if you&apos;re
              curious about machine learning, put your name in early. No prior
              ML experience required, just commitment.
            </p>
            <div className={styles.applyCtas}>
              <Button href={LINKS.joinForm} variant="onDark" external>
                Apply now →
              </Button>
              <Button href={LINKS.email} variant="outlineOnDark">
                Ask us a question
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
