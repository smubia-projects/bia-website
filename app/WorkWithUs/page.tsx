import React from "react";
import Image from "next/image";
import styles from "./WorkWithUs.module.css";
import ScrollReveal from "../components/ui/ScrollReveal";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import CountUp from "../components/ui/CountUp";
import { MotionImage, MotionSurface } from "../components/ui/MotionElements";
import { LINKS } from "../lib/links";
import { STAT_FOCAL, INVOLVEMENT, SHOW_PARTNERS, PARTNERS } from "./data";

export const metadata = {
  title: "Work with Us — SMUBIA",
  description:
    "Partner with SMU's Business Intelligence & Analytics Club. Run an event or sponsor a programme challenge and reach 2,000+ analytics-minded students at SMU.",
};

// Existing site image (Vercel Blob) — reused per Wave 3 spec.
const HERO_IMAGE =
  "https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/biapic2-CKSujqIfzxfHoHCdrWlUtHD3XftCgu.jpg";

export default function WorkWithUsPage() {
  return (
    <main className={styles.page}>
      {/* Split hero: copy left, photo right */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <SectionHeading
              size="hero"
              eyebrow="Partnerships"
              title="Work with us"
              lede="Reach 2,000+ analytics-minded students at SMU."
            />
            <div className={styles.heroCtas}>
              <Button href={LINKS.partnershipEmail} variant="primary">
                Get in touch
              </Button>
            </div>
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

      {/* Why partner — copy left, focal stat right (mirrors the hero split) */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <div className={styles.whyGrid}>
            <ScrollReveal>
              <SectionHeading
                eyebrow="Why partner with us"
                title="One of SMU's largest analytics communities"
              />
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className={styles.spotlight}>
                <span className={styles.spotlightNum}>
                  {/* TBC — confirm with club */}
                  <CountUp value={STAT_FOCAL.value} suffix={STAT_FOCAL.suffix} />
                </span>
                <span className={styles.spotlightLabel}>{STAT_FOCAL.label}</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Two involvement types */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Ways to work together"
              title="Two ways to work with us"
            />
          </ScrollReveal>
          <div className={styles.involveGrid}>
            {INVOLVEMENT.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <MotionSurface
                  as="article"
                  className={styles.involveCard}
                  hover={{ y: -3, boxShadow: "var(--shadow-md)" }}
                >
                  <h3 className={styles.involveTitle}>{item.title}</h3>
                  <p className={styles.involveBody}>{item.body}</p>
                  <ul className={styles.involveList}>
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </MotionSurface>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Past partners (hidden until logos are provided — scaffolding retained) */}
      {SHOW_PARTNERS && PARTNERS.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <ScrollReveal>
              <SectionHeading
                eyebrow="Past partners"
                title="Companies we've worked with"
                align="center"
              />
            </ScrollReveal>
            <div className={styles.partnerStrip}>
              {PARTNERS.map((partner) => (
                <MotionImage
                  key={partner.name}
                  src={partner.logo}
                  alt={partner.name}
                  width={140}
                  height={56}
                  className={styles.partnerLogo}
                  hover={{ opacity: 1 }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA (dark pine) */}
      <section className={styles.contactBand}>
        <div className={styles.contactGlow} aria-hidden="true" />
        <div className={styles.contactInner}>
          <ScrollReveal>
            <h2 className={styles.contactTitle}>Let&apos;s talk partnership</h2>
            <div className={styles.contactCtas}>
              <Button href={LINKS.partnershipEmail} variant="onDark">
                Get in touch →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
