import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  FlaskConical,
  Sparkles,
  Rocket,
  Flag,
  Medal,
  Trophy,
  ArrowRight,
} from "lucide-react";
import ScrollReveal from "@/app/components/ui/ScrollReveal";
import CountUp from "@/app/components/ui/CountUp";
import styles from "./page.module.css";

export const metadata = {
  title: "AI Lodge | SMUBIA",
  description:
    "AI Lodge is SMUBIA's 8-week fireside programme where you learn AI in a tight-knit lodge, build your own project, and ship it — every skill level welcome.",
};

/** What a week in the lodge looks like. */
const weekly = [
  {
    Icon: Compass,
    title: "A topic a week",
    body: "Foundational ML and AI concepts, unpacked one week at a time by your Lodge Captains.",
  },
  {
    Icon: FlaskConical,
    title: "Guided labs",
    body: "Learn by building — hands-on labs where the theory turns into something that runs.",
  },
  {
    Icon: Sparkles,
    title: "Automation & vibecoding",
    body: "Play with automation tools and learn to vibecode your ideas into working prototypes.",
  },
  {
    Icon: Rocket,
    title: "Toward the hackathon",
    body: "Every session sharpens the skills you'll pour into your final AI Lodge project.",
  },
];

/** The three beats of the AI Lodge Hackathon. */
const steps = [
  {
    Icon: Flag,
    label: "Step 01",
    title: "Hack Day",
    body: "The problem statement drops and every lodge starts building — one room, one deadline, all in.",
  },
  {
    Icon: Medal,
    label: "Step 02",
    title: "Top 10 finalists",
    body: "Submissions are judged internally, and ten standout projects advance to the final pitches.",
  },
  {
    Icon: Trophy,
    label: "Step 03",
    title: "Finals Day",
    body: "Finalists pitch to a panel of judges — capped off with prizes and a night of networking.",
  },
];

/** Photo reel for the Highlights band (duplicated in the track for a seamless loop). */
const reel = [
  { src: "/images/ailodge/demo-2.webp", alt: "Lodgers reacting to a live demo on demo day" },
  { src: "/images/ailodge/session-1.webp", alt: "A lodge huddled around a laptop during a session" },
  { src: "/images/ailodge/demo-1.webp", alt: "Two lodgers showing off their finished project" },
  { src: "/images/ailodge/family-2.webp", alt: "A lodge together after an evening session" },
  { src: "/images/ailodge/session-2.webp", alt: "Lodgers mid-session, tools out" },
  { src: "/images/ailodge/demo-3.webp", alt: "A lodger presenting her project at demo day" },
  { src: "/images/ailodge/hero-3.webp", alt: "AWSome Lodge group photo" },
];

export default function AILodgePage() {
  return (
    <main className={styles.page}>
      {/* 1 — HERO · deepest warm dusk, firelight glows, photo cluster */}
      <section className={`${styles.hero} ${styles.dusk}`}>
        <div className={styles.emberGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>AI Lodge</span>
            <h1 className={styles.title}>
              Build your own AI,
              <br />
              <span className={styles.titleAccent}>by the fire.</span>
            </h1>
            <p className={styles.heroLede}>
              An 8-week programme where you learn AI inside a tight-knit lodge,
              build a project that&apos;s yours, and ship it — beginners and pros
              alike, all gathered around the same fire.
            </p>
            <div className={styles.heroActions}>
              {/* TODO: AI Lodge infosite link — user will supply */}
              <a href="#" className={styles.ctaPrimary}>
                Join AI Lodge
              </a>
            </div>
          </div>

          <div className={styles.cluster} aria-hidden="true">
            <div className={`${styles.clusterPhoto} ${styles.p2}`}>
              <Image
                src="/images/ailodge/hero-3.webp"
                alt=""
                fill
                sizes="(max-width: 900px) 45vw, 17rem"
                className={styles.photoImg}
              />
            </div>
            <div className={`${styles.clusterPhoto} ${styles.p1}`}>
              <Image
                src="/images/ailodge/hero-1.webp"
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 50vw, 16rem"
                className={styles.photoImg}
              />
            </div>
            <div className={`${styles.clusterPhoto} ${styles.p3}`}>
              <Image
                src="/images/ailodge/hero-2.webp"
                alt=""
                fill
                sizes="(max-width: 900px) 35vw, 12rem"
                className={styles.photoImg}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2 — WHAT IS AI LODGE · warm parchment */}
      <section className={`${styles.band} ${styles.warm}`}>
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.headingWide}>
              <span className={styles.eyebrow}>The programme</span>
              <h2 className={styles.h2}>What is AI Lodge?</h2>
              <p className={styles.lede}>
                Teams called <strong>lodges</strong> spend eight weeks exploring
                AI — the theory, the real applications, and the building. You&apos;re
                guided all the way to your own AI project, and it&apos;s made for
                every level: from your first line of Python to your first deployed
                model.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 3 — STATS · warm ember band, big amber numbers */}
      <section className={`${styles.band} ${styles.warmBand}`}>
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.statRow}>
              <div className={styles.stat}>
                {/* TBC — confirm with club */}
                <span className={styles.statNum}>
                  <CountUp value={7} />
                </span>
                <span className={styles.statLabel}>Lodges</span>
              </div>
              <div className={styles.statDivider} aria-hidden="true" />
              <div className={styles.stat}>
                {/* TBC — confirm with club */}
                <span className={styles.statNum}>
                  <span className={styles.statApprox}>~</span>
                  <CountUp value={70} />
                </span>
                <span className={styles.statLabel}>Lodgers</span>
              </div>
              <div className={styles.statDivider} aria-hidden="true" />
              <div className={styles.stat}>
                {/* TBC — confirm with club */}
                <span className={styles.statNum}>
                  <CountUp value={8} />
                </span>
                <span className={styles.statLabel}>Weeks</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 4 — WEEKLY LODGE SESSIONS · warm parchment split */}
      <section className={`${styles.band} ${styles.warm}`}>
        <div className={styles.inner}>
          <div className={styles.split}>
            <div className={styles.splitCopy}>
              <ScrollReveal>
                <span className={styles.eyebrow}>Every week</span>
                <h2 className={styles.h2}>Weekly lodge sessions</h2>
                <p className={styles.lede}>
                  Hands-on workshops led by Lodge Captains — a different AI topic
                  each week, built to give you real skills and a project you&apos;re
                  proud of.
                </p>
              </ScrollReveal>
              <ul className={styles.featureList}>
                {weekly.map((w, i) => (
                  <ScrollReveal key={w.title} delay={i * 40}>
                    <li className={styles.feature}>
                      <span className={styles.featureIcon} aria-hidden="true">
                        <w.Icon size={20} strokeWidth={2} />
                      </span>
                      <div>
                        <h3 className={styles.featureTitle}>{w.title}</h3>
                        <p className={styles.featureBody}>{w.body}</p>
                      </div>
                    </li>
                  </ScrollReveal>
                ))}
              </ul>
            </div>

            <ScrollReveal delay={80}>
              <div className={styles.sessionPhotos}>
                <div className={`${styles.photoFrame} ${styles.sessionA}`}>
                  <Image
                    src="/images/ailodge/session-1.webp"
                    alt="A lodge working through a lab around a laptop"
                    fill
                    sizes="(max-width: 860px) 90vw, 24rem"
                    className={styles.photoImg}
                  />
                </div>
                <div className={`${styles.photoFrame} ${styles.sessionB}`}>
                  <Image
                    src="/images/ailodge/session-2.webp"
                    alt="Lodgers mid-session with tools out"
                    fill
                    sizes="(max-width: 860px) 60vw, 16rem"
                    className={styles.photoImg}
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* 5 — AI LODGE FAMILY · the emotional heart, peak warmth (dusk) */}
      <section className={`${styles.band} ${styles.dusk} ${styles.familyBand}`}>
        <div className={styles.familyGlow} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.split}>
            <ScrollReveal>
              <div className={styles.familyPhotos}>
                <div className={`${styles.photoFrame} ${styles.familyA}`}>
                  <Image
                    src="/images/ailodge/family.webp"
                    alt="A lodge sharing a meal together after sessions"
                    fill
                    sizes="(max-width: 860px) 90vw, 24rem"
                    className={styles.photoImg}
                  />
                </div>
                <div className={`${styles.photoFrame} ${styles.familyB}`}>
                  <Image
                    src="/images/ailodge/family-2.webp"
                    alt="A lodge together after an evening session"
                    fill
                    sizes="(max-width: 860px) 55vw, 15rem"
                    className={styles.photoImg}
                  />
                </div>
              </div>
            </ScrollReveal>

            <div className={styles.splitCopy}>
              <ScrollReveal delay={60}>
                <span className={styles.eyebrow}>The family</span>
                <h2 className={styles.h2}>You leave with a lodge, not just a certificate.</h2>
                <p className={styles.lede}>
                  Learning sticks when it&apos;s shared. Beyond the technical
                  growth, AI Lodge runs on peer mentorship, late-night debugging,
                  and friendships that outlast the eight weeks.
                </p>
                <p className={styles.familyPull}>
                  Today&apos;s lodgers become tomorrow&apos;s Lodge Captains —
                  passing on what they learnt and keeping the fire going across
                  generations.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — HACKATHON · warm parchment, 3-step flow */}
      <section className={`${styles.band} ${styles.warm}`}>
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.headingWide}>
              <div className={styles.eyebrowRow}>
                <span className={styles.eyebrow}>The finale</span>
                <span className={styles.newBadge}>New</span>
              </div>
              <h2 className={styles.h2}>The AI Lodge Hackathon</h2>
              <p className={styles.lede}>
                Eight weeks of building lead here — a launch, a shortlist, and a
                finals day where lodgers pitch what they made.
              </p>
            </div>
          </ScrollReveal>

          <div className={styles.stepFlow}>
            {steps.map((s, i) => (
              <React.Fragment key={s.title}>
                <ScrollReveal delay={i * 50}>
                  <div className={styles.step}>
                    <div className={styles.stepTop}>
                      <span className={styles.stepIcon} aria-hidden="true">
                        <s.Icon size={22} strokeWidth={2} />
                      </span>
                      <span className={styles.stepLabel}>{s.label}</span>
                    </div>
                    <h3 className={styles.stepTitle}>{s.title}</h3>
                    <p className={styles.stepBody}>{s.body}</p>
                  </div>
                </ScrollReveal>
                {i < steps.length - 1 && (
                  <ArrowRight
                    className={styles.stepArrow}
                    size={22}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — HIGHLIGHTS · warm dusk, flowing photo reel */}
      <section className={`${styles.band} ${styles.dusk} ${styles.reelBand}`}>
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.headingWide}>
              <span className={styles.eyebrow}>Highlights</span>
              <h2 className={styles.h2}>Moments from the fire</h2>
            </div>
          </ScrollReveal>
        </div>
        <div className={styles.reelViewport}>
          <div className={styles.reelTrack}>
            {[...reel, ...reel].map((img, i) => (
              <div className={styles.reelItem} key={`${img.src}-${i}`}>
                <Image
                  src={img.src}
                  alt={i < reel.length ? img.alt : ""}
                  fill
                  sizes="(max-width: 640px) 55vw, 15rem"
                  className={styles.photoImg}
                />
              </div>
            ))}
          </div>
          <div className={styles.reelFadeLeft} aria-hidden="true" />
          <div className={styles.reelFadeRight} aria-hidden="true" />
        </div>
      </section>

      {/* 8 — CLOSING CTA · deep dusk, embers, single primary CTA */}
      <section className={`${styles.band} ${styles.dusk} ${styles.closing}`}>
        <div className={styles.emberGlow} aria-hidden="true" />
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.closingInner}>
              <span className={styles.eyebrow}>Pull up a log</span>
              <h2 className={styles.closingTitle}>Come build with us.</h2>
              <p className={styles.closingLede}>
                Eight weeks, one lodge, and a project that&apos;s yours. Doors open
                each intake — grab a seat by the fire.
              </p>
              <div className={styles.closingActions}>
                {/* TODO: AI Lodge infosite link — user will supply */}
                <a href="#" className={styles.ctaPrimary}>
                  Join AI Lodge
                </a>
                <Link
                  href="/Projects?badge=AI%20Lodge"
                  className={styles.ctaGhost}
                >
                  See what lodgers built
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
