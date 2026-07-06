import React from "react";
import Image from "next/image";
import styles from "./WorkWithUs.module.css";
import ScrollReveal from "../components/ui/ScrollReveal";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import CountUp from "../components/ui/CountUp";
import {
  STAT_FOCAL,
  STAT_MINOR,
  INVOLVEMENT,
  SHOW_PARTNERS,
  PARTNERS,
} from "./data";

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
              eyebrow="Partnerships"
              title="Work with us"
              lede="Reach 2,000+ analytics-minded students at SMU."
            />
            <div className={styles.heroCtas}>
              <Button href="/ContactUs" variant="primary">
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

      {/* Why partner — stat spotlight */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Why partner with us"
              title="One of SMU's largest analytics communities"
              align="center"
            />
          </ScrollReveal>

          <ScrollReveal delay={100}>
            {/* Stat spotlight — ONE focal number, minor stats beneath. All TBC. */}
            <div className={styles.spotlight}>
              <span className={styles.spotlightNum}>
                {/* TBC — confirm with club */}
                <CountUp value={STAT_FOCAL.value} suffix={STAT_FOCAL.suffix} />
              </span>
              <span className={styles.spotlightLabel}>{STAT_FOCAL.label}</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <div className={styles.minorRow}>
              {STAT_MINOR.map((stat) => (
                <div key={stat.label} className={styles.minorStat}>
                  <span className={styles.minorNum}>
                    {/* TBC — confirm with club */}
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className={styles.minorLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Two involvement types */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Ways to work together"
              title="Two ways to get involved"
            />
          </ScrollReveal>
          <div className={styles.involveGrid}>
            {INVOLVEMENT.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 100}>
                <article className={styles.involveCard}>
                  <span className={styles.involveKicker}>{item.kicker}</span>
                  <h3 className={styles.involveTitle}>{item.title}</h3>
                  <p className={styles.involveBody}>{item.body}</p>
                  <ul className={styles.involveList}>
                    {item.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <div className={styles.involveCta}>
                    <Button href="/ContactUs" variant="outline">
                      {item.cta} →
                    </Button>
                  </div>
                </article>
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
                <Image
                  key={partner.name}
                  src={partner.logo}
                  alt={partner.name}
                  width={140}
                  height={56}
                  className={styles.partnerLogo}
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
            <p className={styles.contactText}>
              One email gets you in front of SMU&apos;s largest analytics
              community. Tell us what you have in mind — we reply fast.
            </p>
            <div className={styles.contactCtas}>
              <Button href="/ContactUs" variant="onDark">
                Get in touch →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
