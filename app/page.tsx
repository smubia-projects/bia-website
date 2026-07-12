import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import ScrollReveal from "./components/ui/ScrollReveal";
import RotatingWord from "./components/ui/RotatingWord";
import CountUp from "./components/ui/CountUp";
import Button from "./components/ui/Button";
import SectionHeading from "./components/ui/SectionHeading";
import AlumniTestimonials from "./components/carousel";
import PathwaysScroll from "./components/PathwaysScroll";
import ProjectsMarquee from "./components/ProjectsMarquee";
import HeroGlobe from "./components/HeroGlobe";
import { getProjects } from "./lib/projects";

// Keep the live projects rail fresh via ISR (matches the /Projects page).
export const revalidate = 3600;

export default async function Home() {
  const projects = (await getProjects()).filter((p) => !p.hidden);

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

          {/* Auto-rotating 3D photo globe of candid club shots */}
          <div className={styles.heroCluster}>
            <HeroGlobe />
            {/* Playful astro-cat kept as a small floating accent on the cluster */}
            <Image
              src="/images/bia-cat-mascot.svg"
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

      {/* Three ways in — scroll-linked accordion; the heading is part of the
          sticky rail, so it pins alongside the tabs (see PathwaysScroll) */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <PathwaysScroll />
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

      {/* Projects rail — the same live showcase marquee as /Projects */}
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
        </div>
        {/* Full-bleed rail — breaks out of the padded section shell */}
        <div className={styles.marqueeWrap}>
          <ProjectsMarquee projects={projects} />
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
              <Button href="/ContactUs#join" variant="onDark" className="gleam">
                Join us →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
