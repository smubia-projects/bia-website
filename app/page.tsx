import { MotionNextLink } from "./components/ui/MotionElements";
import styles from "./page.module.css";
import ScrollReveal from "./components/ui/ScrollReveal";
import RotatingWord from "./components/ui/RotatingWord";
import CountUp from "./components/ui/CountUp";
import Button from "./components/ui/Button";
import SectionHeading from "./components/ui/SectionHeading";
import AlumniTestimonials from "./components/carousel";
import PathwaysScroll from "./components/PathwaysScroll";
import ProjectsMarquee from "./components/ProjectsMarquee";
import { getProjects } from "./lib/projects";
import HomeHeroCluster from "./components/HomeHeroCluster";
import { LINKS } from "./lib/links";

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
              SMU&apos;s home for
              <br />
              <RotatingWord />
            </h1>
            <p className={styles.heroSub}>
              Build your foundation through our beginner-friendly curriculum and
              flagship AI/ML programmes.
            </p>
            <div className={styles.heroCtas}>
              <Button href={LINKS.telegram} variant="onDark" external>
                Join us →
              </Button>
              <Button href="/Projects" variant="outlineOnDark">
                See our projects
              </Button>
            </div>
          </div>

          {/* Candid photo cluster — slightly-tilted collage */}
          <HomeHeroCluster />
        </div>
      </section>

      {/* Scroll-linked programme accordion */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="What We Do"
              title="Across data, machine learning & AI"
              lede="Whether you're a complete beginner or a data buff, we've got something for you."
            />
          </ScrollReveal>
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
                eyebrow="Project Showcase"
                title="Our members&apos; creations"
                lede="Explore what DAP and AI Lodge members have built."
              />
              <MotionNextLink
                href="/Projects"
                className={styles.seeAll}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                See all projects →
              </MotionNextLink>
            </div>
          </ScrollReveal>
        </div>
        {/* Full-bleed rail — breaks out of the padded section shell */}
        <div className={styles.marqueeWrap}>
          <ProjectsMarquee projects={projects} mobileFocused />
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
              Interested in data and AI?
            </h2>
            <div className={styles.joinCtas}>
              <Button
                href={LINKS.telegram}
                variant="onDark"
                className="gleam"
                external
              >
                Join BIA →
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
