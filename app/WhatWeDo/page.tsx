import React from "react";
import Image from "next/image";
import Wordcard from "../components/Wordcard";
import styles from "./WhatWeDo.module.css";
import TimelineMain from "../components/Timelines/TimelineMain";
import ScrollReveal from "../components/ui/ScrollReveal";
import SectionHeading from "../components/ui/SectionHeading";
import CountUp from "../components/ui/CountUp";
import Button from "../components/ui/Button";
import { LINKS } from "../lib/links";
import { DATATHON } from "./datathonData";

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

const Page: React.FC = () => {
  return (
    <main className={styles.page}>
      {/* Page header */}
      <section className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerText}>
            <SectionHeading
              eyebrow="What we do"
              title="A full year of data, from first query to final model"
              lede="Workshops open to everyone, semester events to plug into the community, and our annual Datathon — no prerequisites, every faculty welcome."
            />
          </div>
          <Image
            src="/images/biaMascot.png"
            alt="BIA mascot"
            width={220}
            height={220}
            className={styles.mascot}
            priority
          />
        </div>
      </section>

      {/* Workshops curriculum */}
      <section id="workshops" className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Workshops"
              title="The curriculum"
              lede="Three workshop tracks each academic year, in order — each one builds on the last. Tap a card for the full syllabus."
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
              eyebrow="Events"
              title="A semester with SMUBIA"
              lede="Beyond the classroom — tea sessions, networking nights, welfare drives and picnics. Swipe through a typical semester."
              align="center"
            />
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <TimelineMain />
          </ScrollReveal>
        </div>
      </section>

      {/* Datathon */}
      <section id="datathon" className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow={DATATHON.eyebrow}
              title={DATATHON.title}
              lede={DATATHON.description}
            />
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className={styles.datathonStats}>
              {DATATHON.stats.map((stat) => (
                <div key={stat.label} className={styles.datathonStat}>
                  <div className={styles.datathonValue}>
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className={styles.datathonLabel}>{stat.label}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div className={styles.datathonCtas}>
              <Button href={LINKS.datathonSite} variant="primary" external>
                Visit the Datathon site →
              </Button>
              <Button href="/ContactUs#join" variant="outline">
                Get notified about the next one
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* DAP pointer */}
      <section className={styles.dapPointer}>
        <div className={styles.dapPointerInner}>
          <ScrollReveal>
            <div className={styles.dapPointerContent}>
              <div>
                <span className="eyebrow eyebrowOnDark">
                  Flagship Programme
                </span>
                <h2 className={styles.dapPointerTitle}>
                  Ready to go deeper? Apply for DAP.
                </h2>
                <p className={styles.dapPointerText}>
                  Our selective Data Associate Programme takes ~50 students a
                  cohort through a full machine learning project, with mentors
                  beside you the whole way.
                </p>
              </div>
              <Button href="/DAP" variant="onDark">
                Discover DAP →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default Page;
