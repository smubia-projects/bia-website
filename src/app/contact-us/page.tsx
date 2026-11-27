import React from "react";
import styles from "./page.module.css";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import ScrollReveal from "../components/ui/ScrollReveal";
import { joinLink, mailto, partnershipMailto } from "@/app/lib/links";
import { getSiteLinks } from "@/app/lib/cms/links";
import { MotionAnchor, MotionSurface } from "../components/ui/MotionElements";

export const metadata = {
  title: "Contact — SMUBIA",
  description:
    "Join SMU's Business Intelligence & Analytics Club, or get in touch about partnerships, workshops and the Data Associate Programme.",
};

const ContactUs = async () => {
  const LINKS = await getSiteLinks();
  const dap = joinLink(LINKS, "DAP");
  const aiLodge = joinLink(LINKS, "AI Lodge");
  return (
    <main className={styles.page}>
      <section className={styles.headerSection}>
        <div className={styles.inner}>
          <SectionHeading
            size="hero"
            eyebrow="Contact"
            title="Say hello"
            lede="Whether you want to join the club, sponsor an event or just ask a question — we're easy to reach."
          />
        </div>
      </section>

      {/* Two audiences — students and companies, side by side */}
      <section className={styles.cardsSection}>
        <div className={styles.inner}>
          <div className={styles.cardGrid}>
            <ScrollReveal>
              <MotionSurface
                id="join"
                className={styles.audienceCard}
                hover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
              >
                <span className={styles.cardKicker}>For students</span>
                <h2 className={styles.cardTitle}>Join SMUBIA</h2>
                <p className={styles.cardText}>
                  No prerequisites and no interviews to become a member — every
                  faculty and skill level is welcome. Join the club, then apply
                  to a programme when you&apos;re ready.
                </p>
                <div className={styles.cardCtas}>
                  <Button href={LINKS.telegram} variant="primary" external>
                    Join our Telegram
                  </Button>
                  <Button href={dap.href} variant="outline" external>
                    {dap.open ? "Apply to DAP" : "DAP updates"}
                  </Button>
                  <Button href={aiLodge.href} variant="outline" external>
                    {aiLodge.open ? "Join AI Lodge" : "AI Lodge updates"}
                  </Button>
                </div>
              </MotionSurface>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <MotionSurface
                id="partners"
                className={styles.audienceCard}
                hover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
              >
                <span className={styles.cardKicker}>For companies</span>
                <h2 className={styles.cardTitle}>Partner with us</h2>
                <p className={styles.cardText}>
                  Run an event or sponsor a programme challenge and reach 2,000+
                  analytics-minded students at SMU.
                </p>
                <div className={styles.cardCtas}>
                  <Button href={partnershipMailto(LINKS)} variant="primary">
                    Email us
                  </Button>
                  <Button href="/work-with-us" variant="outline">
                    See partnership options
                  </Button>
                </div>
              </MotionSurface>
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <p className={styles.fallback}>
              For anything else, email us at{" "}
              <MotionAnchor
                href={mailto(LINKS.email)}
                className={styles.fallbackLink}
                hover={{ color: "var(--emerald-strong)" }}
              >
                {LINKS.email}
              </MotionAnchor>
              .
            </p>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
