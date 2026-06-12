import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import ScrollReveal from "./components/ui/ScrollReveal";
import RotatingWord from "./components/ui/RotatingWord";
import CountUp from "./components/ui/CountUp";
import Button from "./components/ui/Button";
import SectionHeading from "./components/ui/SectionHeading";
import AlumniTestimonials from "./components/carousel";
import { LINKS } from "./lib/links";

const OFFERINGS = [
  {
    number: "01",
    title: "Workshops",
    tag: null,
    body: "Hands-on technical workshops every semester — SQL, Excel, Pandas, data visualisation and data science fundamentals. No prior experience needed.",
    href: "/WhatWeDo#workshops",
  },
  {
    number: "02",
    title: "Data Associate Programme",
    tag: "Flagship",
    body: "Our selective AI/ML programme. Small teams, weekly theory sessions, and a self-initiated machine learning project mentored from idea to demo day.",
    href: "/DAP",
  },
  {
    number: "03",
    title: "BIA Datathon",
    tag: null,
    body: "Our annual case-study datathon every January — teams across all faculties compete to turn a real dataset into insight, in front of industry judges.",
    href: "/WhatWeDo#datathon",
  },
];

const REACH_STATS = [
  { value: 2000, suffix: "+", label: "Members & alumni" },
  { value: 400, suffix: "+", label: "New members yearly" },
  { value: 2000, suffix: "+", label: "Telegram subscribers" },
  { value: 1000, suffix: "+", label: "Instagram followers" },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <div className={styles.heroEyebrow}>
              <span className={styles.heroEyebrowLine} />
              <span className="eyebrow eyebrowOnDark">
                SMU Business Intelligence &amp; Analytics Club
              </span>
            </div>
            <h1 className={styles.heroTitle}>
              Where SMU does
              <br />
              <RotatingWord />
            </h1>
            <p className={styles.heroSub}>
              From your first SQL query to a deployed machine learning model —
              workshops, our flagship Data Associate Programme and the annual
              BIA Datathon, open to every faculty and every background.
            </p>
            <div className={styles.heroCtas}>
              <Button href="/ContactUs#join" variant="onDark">
                Join the club →
              </Button>
              <Button href="/WorkWithUs" variant="outlineOnDark">
                Partner with us
              </Button>
            </div>
          </div>
          <div className={styles.heroMascot}>
            <Image
              src="/images/biaMascot.png"
              alt="BIA astronaut cat mascot"
              width={400}
              height={400}
              className={styles.mascotImage}
              priority
            />
          </div>
        </div>
        <div className={styles.heroStats}>
          <span className={styles.heroStat}>
            <strong>2,000+</strong> members
          </span>
          <span className={styles.heroStat}>
            <strong>5</strong> faculties
          </span>
          <span className={styles.heroStat}>
            est. <strong>2015</strong>
          </span>
        </div>
      </section>

      {/* What we offer */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="What we do"
              title="Practical data skills, from day one"
              lede="Our mission is a people-centric community that nurtures a passion for analytics — through opportunities and projects, regardless of prior expertise or background."
            />
          </ScrollReveal>
          <div className={styles.offerGrid}>
            {OFFERINGS.map((offer, i) => (
              <ScrollReveal key={offer.number} delay={i * 100}>
                <Link href={offer.href} className={styles.offerCard}>
                  <span className={styles.offerNumber}>{offer.number}</span>
                  <h3 className={styles.offerTitle}>
                    {offer.title}
                    {offer.tag && (
                      <span className={styles.offerTag}>{offer.tag}</span>
                    )}
                  </h3>
                  <p className={styles.offerBody}>{offer.body}</p>
                  <span className={styles.offerLink}>Explore →</span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Reach */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Our reach"
              title="A community that keeps growing"
              lede="Since 2015 we've grown from a few enthusiasts into one of SMU's largest student communities, spanning all five faculties."
            />
          </ScrollReveal>
          <div className={styles.reachLayout}>
            <ScrollReveal>
              <div className={styles.statGrid}>
                {REACH_STATS.map((stat) => (
                  <div key={stat.label}>
                    <div className={styles.statValue}>
                      <CountUp value={stat.value} />
                      <span>{stat.suffix}</span>
                    </div>
                    <div className={styles.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <Image
                src="https://ssvs8thfuktvqsqk.public.blob.vercel-storage.com/biapic2-CKSujqIfzxfHoHCdrWlUtHD3XftCgu.jpg"
                alt="SMUBIA members at a club event"
                width={0}
                height={0}
                sizes="(min-width: 1024px) 40vw, 90vw"
                className={styles.reachImage}
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* DAP spotlight */}
      <section className={styles.dapBand}>
        <div className={styles.dapGlow} aria-hidden="true" />
        <div className={styles.dapInner}>
          <ScrollReveal>
            <SectionHeading
              tone="dark"
              eyebrow="Flagship Programme"
              title="The Data Associate Programme"
              lede="A selective, project-driven AI/ML programme. Each cohort of around 50 associates works in small mentored teams — from theory sessions to a working model they present at our showcase."
            />
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className={styles.dapMeta}>
              <span className={styles.dapMetaItem}>
                <strong>~50</strong> per cohort
              </span>
              <span className={styles.dapMetaItem}>
                <strong>9+</strong> batches &amp; counting
              </span>
              <span className={styles.dapMetaItem}>
                application-based
              </span>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <div>
              <Button href="/DAP" variant="onDark">
                Discover DAP →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Alumni testimonials */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <AlumniTestimonials />
          </ScrollReveal>
        </div>
      </section>

      {/* Join CTA */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner} style={{ textAlign: "center" }}>
          <ScrollReveal>
            <h2 className={styles.joinHeading}>
              Ready to get your hands dirty with data?
            </h2>
            <p className={styles.joinText}>
              SMUBIA was started in 2015 by a few enthusiasts. Today we&apos;re
              a thriving community — and there&apos;s a seat for you,
              whatever your background.
            </p>
            <div className={styles.joinCtas}>
              <Button href={LINKS.telegram} variant="primary" external>
                Join our Telegram
              </Button>
              <Button href={LINKS.joinForm} variant="outline" external>
                Sign-up form
              </Button>
              <Button href={LINKS.instagram} variant="outline" external>
                Instagram
              </Button>
            </div>
            <p className={styles.joinFootnote}>
              Companies and recruiters — see how to{" "}
              <Link href="/WorkWithUs">work with us</Link> or follow us on{" "}
              <a
                href={LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              .
            </p>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
