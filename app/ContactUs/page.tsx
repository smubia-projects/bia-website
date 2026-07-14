import React from "react";
import styles from "./page.module.css";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import ScrollReveal from "../components/ui/ScrollReveal";
import { LINKS } from "../lib/links";
import { MotionAnchor, MotionSurface } from "../components/ui/MotionElements";

export const metadata = {
  title: "Contact — SMUBIA",
  description:
    "Join SMU's Business Intelligence & Analytics Club, or get in touch about partnerships, workshops and the Data Associate Programme.",
};

const ContactUs = () => {
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

      {/* Join CTAs */}
      <section id="join" className={styles.joinSection}>
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.joinCard}>
              <h2 className={styles.joinTitle}>Join SMUBIA</h2>
              <p className={styles.joinText}>
                No prerequisites, no interviews to be a member — every faculty
                and every skill level is welcome. Three ways in:
              </p>
              <div className={styles.joinCtas}>
                <Button href={LINKS.telegram} variant="primary" external>
                  Join our Telegram
                </Button>
                <Button href="/DAP" variant="outline">
                  Apply to DAP
                </Button>
                <Button href={LINKS.aiLodgeInfosite} variant="outline">
                  Join AI Lodge
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Partner with us — landing target for the Partners page CTAs */}
      <section id="partners" className={styles.partnerSection}>
        <div className={styles.inner}>
          <ScrollReveal>
            <div className={styles.joinCard}>
              <h2 className={styles.joinTitle}>Partner with us</h2>
              <p className={styles.joinText}>
                Run an event or sponsor a programme challenge and reach 2,000+
                analytics-minded students at SMU. Tell us what you have in mind
                — we reply fast.
              </p>
              <div className={styles.joinCtas}>
                <Button
                  href={LINKS.partnershipEmail}
                  variant="primary"
                >
                  Email us
                </Button>
                <Button href="/WorkWithUs" variant="outline">
                  See partnership options
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Other channels */}
      <section className={styles.channelsSection}>
        <div className={styles.inner}>
          <div className={styles.channelGrid}>
            <ScrollReveal>
              <MotionSurface
                className={styles.channelCard}
                hover={{ y: -2, boxShadow: "var(--shadow-sm)" }}
              >
                <h3 className={styles.channelTitle}>General enquiries</h3>
                <p className={styles.channelText}>
                  Questions about workshops, DAP or anything else.
                </p>
                <MotionAnchor
                  href={LINKS.email}
                  className={styles.channelLink}
                  hover={{ x: 3, color: "var(--emerald-strong)" }}
                >
                  bia@sa.smu.edu.sg →
                </MotionAnchor>
              </MotionSurface>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <MotionSurface
                className={styles.channelCard}
                hover={{ y: -2, boxShadow: "var(--shadow-sm)" }}
              >
                <h3 className={styles.channelTitle}>Professional network</h3>
                <p className={styles.channelText}>
                  Follow club news and alumni stories on LinkedIn.
                </p>
                <MotionAnchor
                  href={LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelLink}
                  hover={{ x: 3, color: "var(--emerald-strong)" }}
                >
                  Connect on LinkedIn →
                </MotionAnchor>
              </MotionSurface>
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <div className={styles.addressBlock}>
              <span className="eyebrow">Find us on campus</span>
              <p className={styles.address}>
                Singapore Management University · Level 5, SMU Connexion ·
                40 Stamford Road · Singapore 178908
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
