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

/** Three entry points into the club. One line of copy each. */
const PILLARS = [
  {
    kicker: "Flagship",
    title: "Data Associate Programme",
    body: "A selective AI/ML cohort — from theory sessions to a demo-day project.",
    href: "/DAP",
    accent: "dap",
  },
  {
    kicker: "New",
    title: "AI Lodge",
    body: "An eight-week build community where teams ship real AI projects.",
    href: LINKS.aiLodgeInfosite,
    accent: "lodge",
  },
  {
    kicker: "Open to all",
    title: "Events & Workshops",
    body: "Hands-on sessions in SQL, Python and data science every semester.",
    href: "/Events",
    accent: "events",
  },
] as const;

/**
 * Static teaser strip — decoupled from the Redis showcase on purpose (Wave 5
 * owns the real /Projects listing). Titles all point to /Projects until
 * per-project slugs are wired up.
 */
const FEATURED_PROJECTS = [
  {
    title: "CaloTracko",
    blurb: "Snap a meal, track your calories with AI.",
  },
  {
    title: "Storie",
    blurb: "Turn everyday photos into shareable stories.",
  },
  {
    title: "Enhance AI",
    blurb: "Sharpen and upscale images in a single click.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Hero — dark pine anchor with candid photo cluster */}
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
              Workshops, a flagship AI programme and a builder community — open
              to every faculty, no experience needed.
            </p>
            <div className={styles.heroCtas}>
              <Button href="/ContactUs#join" variant="onDark">
                Join us →
              </Button>
              <Button href="/Projects" variant="outlineOnDark">
                See our projects
              </Button>
            </div>
          </div>

          {/* Candid photo cluster — slightly-tilted collage */}
          <div className={styles.heroCluster}>
            <figure className={`${styles.clusterPhoto} ${styles.clusterA}`}>
              <Image
                src="/images/home/hero-cohort.webp"
                alt="SMUBIA Data Associate Programme cohort"
                fill
                sizes="(min-width: 1024px) 30vw, 60vw"
                className={styles.clusterImg}
                priority
              />
            </figure>
            <figure className={`${styles.clusterPhoto} ${styles.clusterB}`}>
              <Image
                src="/images/home/hero-demoday.webp"
                alt="Members presenting at an AI Lodge demo day"
                fill
                sizes="(min-width: 1024px) 22vw, 45vw"
                className={styles.clusterImg}
              />
            </figure>
            <figure className={`${styles.clusterPhoto} ${styles.clusterC}`}>
              <Image
                src="/images/home/hero-ailodge.webp"
                alt="An AI Lodge team hanging out"
                fill
                sizes="(min-width: 1024px) 28vw, 55vw"
                className={styles.clusterImg}
              />
            </figure>
            {/* Playful astro-cat kept as a small floating accent on the cluster */}
            <Image
              src="/images/biaMascot.png"
              alt=""
              aria-hidden="true"
              width={160}
              height={160}
              className={styles.clusterMascot}
            />
          </div>
        </div>
        <div className={styles.heroStats}>
          <span className={styles.heroStat}>
            <strong>2,000+</strong> members {/* TBC — confirm with club */}
          </span>
          <span className={styles.heroStat}>
            <strong>5</strong> faculties
          </span>
          <span className={styles.heroStat}>
            est. <strong>2015</strong>
          </span>
        </div>
      </section>

      {/* Three pillars */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="What we do"
              title="Three ways in"
              lede="Pick your entry point — from your first workshop to a deployed model."
            />
          </ScrollReveal>
          <div className={styles.pillarGrid}>
            {PILLARS.map((pillar, i) => (
              <ScrollReveal key={pillar.title} delay={i * 100}>
                <Link
                  href={pillar.href}
                  className={`${styles.pillarCard} ${styles[pillar.accent]}`}
                >
                  <span className={styles.pillarBar} aria-hidden="true" />
                  <span className={styles.pillarKicker}>{pillar.kicker}</span>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarBody}>{pillar.body}</p>
                  <span className={styles.pillarLink}>Explore →</span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stat spotlight — one focal number, minors beneath */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.spotlight}>
              <div className={styles.spotlightFocal}>
                <div className={styles.spotlightNumber}>
                  {/* TBC — confirm with club */}
                  <CountUp value={2000} suffix="+" />
                </div>
                <p className={styles.spotlightLabel}>
                  members &amp; alumni across SMU
                </p>
              </div>
              <div className={styles.spotlightMinors}>
                <div className={styles.spotlightMinor}>
                  <div className={styles.minorNumber}>
                    {/* TBC — confirm with club */}
                    <CountUp value={400} suffix="+" />
                  </div>
                  <div className={styles.minorLabel}>new members / year</div>
                </div>
                <div className={styles.spotlightMinor}>
                  <div className={styles.minorNumber}>
                    {/* TBC — confirm with club */}
                    <CountUp value={9} />
                  </div>
                  <div className={styles.minorLabel}>DAP cohorts</div>
                </div>
                <div className={styles.spotlightMinor}>
                  <div className={styles.minorNumber}>
                    {/* TBC — confirm with club */}
                    <CountUp value={5} />
                  </div>
                  <div className={styles.minorLabel}>faculties</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Featured projects strip — static teaser, links to /Projects */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <div className={styles.projectsHead}>
              <SectionHeading
                eyebrow="From our builders"
                title="Projects that shipped"
                lede="A taste of what members build across DAP and AI Lodge."
              />
              <Link href="/Projects" className={styles.seeAll}>
                See all projects →
              </Link>
            </div>
          </ScrollReveal>
          <div className={styles.projectGrid}>
            {FEATURED_PROJECTS.map((project, i) => (
              <ScrollReveal key={project.title} delay={i * 100}>
                {/* Links to the showcase listing until per-project slugs are wired */}
                <Link href="/Projects" className={styles.projectCard}>
                  <h3 className={styles.projectTitle}>{project.title}</h3>
                  <p className={styles.projectBlurb}>{project.blurb}</p>
                  <span className={styles.projectLink}>View →</span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Alumni testimonials */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <AlumniTestimonials />
          </ScrollReveal>
        </div>
      </section>

      {/* Join CTA — closing dark pine band */}
      <section className={styles.joinBand}>
        <div className={styles.joinGlow} aria-hidden="true" />
        <div className={styles.joinInner}>
          <ScrollReveal>
            <h2 className={styles.joinHeading}>
              Ready to get your hands on data?
            </h2>
            <p className={styles.joinText}>
              There&apos;s a seat for you, whatever your background.
            </p>
            <div className={styles.joinCtas}>
              <Button href="/ContactUs#join" variant="onDark">
                Join us →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
