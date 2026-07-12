import React from "react";
import Image from "next/image";
import Link from "next/link";
import Wordcard from "../components/Wordcard";
import styles from "./Events.module.css";
import TimelineMain from "../components/Timelines/TimelineMain";
import ScrollReveal from "../components/ui/ScrollReveal";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import { LINKS } from "../lib/links";

export const metadata = {
  title: "Events — SMUBIA",
  description:
    "Public workshops, semester events and community activities at SMU's Business Intelligence & Analytics Club. No prerequisites, every faculty welcome.",
};

// Existing site image, reused for the split hero (per Wave 3 spec).
const HERO_IMAGE = "/images/biapic1.jpg";

const WORKSHOPS = [
  {
    number: "01",
    title: "Data Handling",
    imageSrc: "/images/SQLSCREEN.png",
    summary: "MySQL, Pandas and Excel — get comfortable wrangling real datasets.",
    overlay: (
      <ul>
        <li>
          <strong>Learn data handling software</strong> such as MySQL, Pandas,
          and Excel.
        </li>
        <li>
          <strong>Master data manipulation</strong> techniques.
        </li>
        <li>
          Lay the groundwork for <strong>data visualisation</strong>.
        </li>
      </ul>
    ),
  },
  {
    number: "02",
    title: "Data Visualisation",
    imageSrc: "/images/dataVis.png",
    summary: "Turn large datasets into charts, graphs and maps that tell a story.",
    overlay: (
      <ul>
        <li>
          <strong>Learn the importance of data visualisation</strong> in making
          sense of large datasets.
        </li>
        <li>
          <strong>Explore graphical representations</strong> of data using
          charts, graphs, and maps.
        </li>
        <li>Gain hands-on experience with visualization tools and techniques.</li>
        <li>
          <strong>Make data-driven decisions</strong> using the insights derived
          from visualizations.
        </li>
      </ul>
    ),
  },
  {
    number: "03",
    title: "Data Science",
    imageSrc: "/images/dataScience.png",
    summary: "The intuition behind AI and machine learning — your primer for DAP.",
    overlay: (
      <ul>
        <li>
          <strong>Learn the intuition behind AI and Machine Learning</strong>.
        </li>
        <li>
          Understand how artificial intelligence makes predictions using data.
        </li>
        <li>
          This is a primer for BIA&apos;s{" "}
          <strong>Data Associate Programme</strong>.
        </li>
        <li>
          Dive deeper into the technical aspects of{" "}
          <strong>Machine Learning</strong>.
        </li>
      </ul>
    ),
  },
];

// Compact links to the two flagship programmes — no deep content here.
const PROGRAMMES = [
  {
    href: "/DAP",
    label: "Data Associate Programme",
    blurb: "Our selective ML programme — one full project, mentors beside you.",
  },
  {
    href: LINKS.aiLodgeInfosite,
    label: "AI Lodge",
    blurb: "An 8-week build community where teams ship real AI projects.",
  },
];

const Page: React.FC = () => {
  return (
    <main className={styles.page}>
      {/* Split hero: copy left, photo right */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <SectionHeading
              size="hero"
              eyebrow="Events & workshops"
              title="A full year of data"
              lede="Open workshops, semester events and community activities — no prerequisites, every faculty welcome."
            />
          </div>
          <div className={styles.heroImageWrap}>
            <Image
              src={HERO_IMAGE}
              alt="The SMUBIA community"
              fill
              sizes="(min-width: 900px) 40vw, 100vw"
              className={styles.heroImage}
              priority
            />
          </div>
        </div>
      </section>

      {/* Workshops curriculum */}
      <section id="workshops" className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Workshops"
              title="The curriculum"
              lede="Three tracks each year, in order — each builds on the last. Tap a card for the syllabus."
            />
          </ScrollReveal>
          <div className={styles.curriculumGrid}>
            {WORKSHOPS.map((workshop, i) => (
              <ScrollReveal key={workshop.number} delay={i * 100}>
                <div className={styles.curriculumCard}>
                  <div className={styles.curriculumMeta}>
                    <span className={styles.curriculumNumber}>
                      {workshop.number}
                    </span>
                    <span className={styles.curriculumTrack} />
                  </div>
                  <div className={styles.curriculumImage}>
                    <Wordcard
                      title={workshop.title}
                      imageSrc={workshop.imageSrc}
                      overlayContent={
                        <div className={styles.modalText}>{workshop.overlay}</div>
                      }
                    />
                  </div>
                  <p className={styles.curriculumSummary}>{workshop.summary}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Events timeline */}
      <section id="events" className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Community"
              title="A semester with SMUBIA"
              lede="Tea sessions, networking nights, welfare drives and picnics. Swipe through a typical semester."
              align="center"
            />
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <TimelineMain />
          </ScrollReveal>
        </div>
      </section>

      {/*
        DATATHON — removed 2026-07. Restore from git history + datathonData.ts
        (retained on disk in this folder) when the event returns.
      */}

      {/* Flagship programmes — compact links only, no deep content */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Go deeper"
              title="Our flagship programmes"
            />
          </ScrollReveal>
          <div className={styles.programmeGrid}>
            {PROGRAMMES.map((prog, i) => (
              <ScrollReveal key={prog.href} delay={i * 100}>
                <Link href={prog.href} className={styles.programmeCard}>
                  <h3 className={styles.programmeTitle}>{prog.label}</h3>
                  <p className={styles.programmeBlurb}>{prog.blurb}</p>
                  <span className={styles.programmeArrow}>Explore →</span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Join CTA (dark pine) */}
      <section className={styles.dapPointer}>
        <div className={styles.dapPointerInner}>
          <ScrollReveal>
            <div className={styles.dapPointerContent}>
              <div>
                <span className="eyebrow eyebrowOnDark">Get involved</span>
                <h2 className={styles.dapPointerTitle}>
                  Come to the next one.
                </h2>
                <p className={styles.dapPointerText}>
                  Workshops and events are open to every faculty — no experience
                  needed. Join the community and we&apos;ll keep you posted.
                </p>
              </div>
              <Button href="/ContactUs#join" variant="onDark">
                Join SMUBIA →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Page;
