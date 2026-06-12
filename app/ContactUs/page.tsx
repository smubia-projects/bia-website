import React from "react";
import Link from "next/link";
import styles from "./page.module.css";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import ScrollReveal from "../components/ui/ScrollReveal";
import { LINKS } from "../lib/links";

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
                and every skill level is welcome. Pick whichever channel suits
                you:
              </p>
              <div className={styles.joinCtas}>
                <Button href={LINKS.telegram} variant="primary" external>
                  Join our Telegram
                </Button>
                <Button href={LINKS.joinForm} variant="outline" external>
                  Membership sign-up form
                </Button>
                <Button href={LINKS.instagram} variant="outline" external>
                  DM us on Instagram
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
              <div className={styles.channelCard}>
                <h3 className={styles.channelTitle}>General enquiries</h3>
                <p className={styles.channelText}>
                  Questions about workshops, DAP or anything else.
                </p>
                <a href={LINKS.email} className={styles.channelLink}>
                  bia@sa.smu.edu.sg →
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className={styles.channelCard}>
                <h3 className={styles.channelTitle}>Professional network</h3>
                <p className={styles.channelText}>
                  Follow club news and alumni stories on LinkedIn.
                </p>
                <a
                  href={LINKS.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelLink}
                >
                  Connect on LinkedIn →
                </a>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className={styles.channelCard}>
                <h3 className={styles.channelTitle}>
                  Companies &amp; sponsors
                </h3>
                <p className={styles.channelText}>
                  Sponsorship tiers, event opportunities and our prospectus.
                </p>
                <Link href="/WorkWithUs" className={styles.channelLink}>
                  Work with us →
                </Link>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal>
            <div className={styles.addressBlock}>
              <span className="eyebrow">Find us on campus</span>
              <p className={styles.address}>
                Singapore Management University · Level 5, SMU Connexion ·
                40 Stamford Road · Singapore 178908
              </p>
              <a
                href={LINKS.prospectus}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.channelLink}
              >
                Download our prospectus (PDF) →
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
