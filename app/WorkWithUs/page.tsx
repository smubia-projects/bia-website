import React from "react";
import Image from "next/image";
import styles from "./WorkWithUs.module.css";
import ScrollReveal from "../components/ui/ScrollReveal";
import SectionHeading from "../components/ui/SectionHeading";
import Button from "../components/ui/Button";
import { LINKS } from "../lib/links";
import {
  TIERS,
  BENEFITS,
  EVENTS,
  WHY_PARTNER,
  SHOW_PARTNERS,
  PARTNERS,
} from "./data";

export const metadata = {
  title: "Work with Us — SMUBIA",
  description:
    "Partner with SMU's Business Intelligence & Analytics Club. Sponsor the BIA Datathon, Networking Night and our flagship Data Associate Programme, and reach 1,500+ data enthusiasts.",
};

export default function WorkWithUsPage() {
  return (
    <main className={styles.page}>
      {/* Hero pitch */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <SectionHeading
            eyebrow="For companies & sponsors"
            title="Partner with SMUBIA"
            lede="We connect companies with one of SMU's largest and most active student communities — 1,500+ data enthusiasts who compete, build and graduate into analytics, engineering and finance roles."
          />
          <div className={styles.heroCtas}>
            <Button href={LINKS.email} variant="primary">
              Talk to our partnerships team
            </Button>
            <Button href={LINKS.prospectus} variant="outline" external>
              Download the prospectus
            </Button>
          </div>
        </div>
      </section>

      {/* Why partner */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Why partner with us"
              title="Three reasons companies come back"
            />
          </ScrollReveal>
          <div className={styles.whyGrid}>
            {WHY_PARTNER.map((card, i) => (
              <ScrollReveal key={card.title} delay={i * 100}>
                <article className={styles.whyCard}>
                  <span className={styles.whyNumber}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className={styles.whyTitle}>{card.title}</h3>
                  <p className={styles.whyBody}>{card.body}</p>
                  <ul className={styles.whyList}>
                    {card.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Events seeking sponsorship */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Sponsorship opportunities"
              title="A full calendar to put your name on"
              lede="From our January Datathon to the biggest student networking night on campus — every event below welcomes sponsors."
            />
          </ScrollReveal>
          <div className={styles.eventGrid}>
            {EVENTS.map((event, i) => (
              <ScrollReveal key={event.name} delay={(i % 4) * 75}>
                <article
                  className={`${styles.eventCard} ${
                    event.highlight ? styles.eventCardHighlight : ""
                  }`}
                >
                  {event.highlight && (
                    <span className={styles.eventTag}>Headline event</span>
                  )}
                  <h3 className={styles.eventName}>{event.name}</h3>
                  <p className={styles.eventTiming}>{event.timing}</p>
                  <p className={styles.eventReach}>{event.reach}</p>
                  <p className={styles.eventItems}>
                    <span>Ideal sponsorship</span>
                    {event.items}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsorship tiers */}
      <section className={styles.sectionMuted}>
        <div className={styles.sectionInner}>
          <ScrollReveal>
            <SectionHeading
              eyebrow="Sponsorship tiers"
              title="Choose your level of visibility"
              lede="Every tier includes the benefits of the tiers below it. Details can always be negotiated — talk to us."
            />
          </ScrollReveal>

          {/* Desktop matrix */}
          <ScrollReveal>
            <div className={styles.tierTableWrap}>
              <table className={styles.tierTable}>
                <thead>
                  <tr>
                    <th className={styles.benefitHeader}>Benefits</th>
                    {TIERS.map((tier, i) => (
                      <th
                        key={tier.id}
                        className={`${styles.tierHeader} ${
                          i === TIERS.length - 1 ? styles.tierHeaderTop : ""
                        }`}
                      >
                        <span className={styles.tierName}>{tier.name}</span>
                        <span className={styles.tierRange}>{tier.range}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BENEFITS.map((benefit) => (
                    <tr key={benefit.label}>
                      <td className={styles.benefitCell}>{benefit.label}</td>
                      {TIERS.map((tier, tierIndex) => (
                        <td
                          key={tier.id}
                          className={`${styles.checkCell} ${
                            tierIndex === TIERS.length - 1
                              ? styles.checkCellTop
                              : ""
                          }`}
                        >
                          {tierIndex >= benefit.minTier ? (
                            <span className={styles.check} aria-label="Included">
                              ✓
                            </span>
                          ) : (
                            <span
                              className={styles.dash}
                              aria-label="Not included"
                            >
                              —
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>

          {/* Mobile stacked cards */}
          <div className={styles.tierCards}>
            {TIERS.map((tier, tierIndex) => (
              <ScrollReveal key={tier.id} delay={tierIndex * 75}>
                <article
                  className={`${styles.tierCard} ${
                    tierIndex === TIERS.length - 1 ? styles.tierCardTop : ""
                  }`}
                >
                  <header className={styles.tierCardHeader}>
                    <span className={styles.tierName}>{tier.name}</span>
                    <span className={styles.tierRange}>{tier.range}</span>
                  </header>
                  <ul className={styles.tierCardList}>
                    {BENEFITS.filter((b) => tierIndex >= b.minTier).map((b) => (
                      <li key={b.label}>{b.label}</li>
                    ))}
                  </ul>
                </article>
              </ScrollReveal>
            ))}
          </div>

          <p className={styles.tierFootnote}>
            * Voucher / discount sponsorships are capped at the Silver tier.
            All details can be further negotiated.
          </p>
        </div>
      </section>

      {/* Past partners (hidden until logos are provided) */}
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

      {/* Contact CTA */}
      <section className={styles.contactBand}>
        <div className={styles.contactGlow} aria-hidden="true" />
        <div className={styles.contactInner}>
          <ScrollReveal>
            <h2 className={styles.contactTitle}>
              Let&apos;s build something together.
            </h2>
            <p className={styles.contactText}>
              Tell us what you have in mind — cash, food, door gifts, mentoring
              or a booth at Networking Night. Our partnerships team replies
              fast.
            </p>
            <div className={styles.contactCtas}>
              <Button href={LINKS.email} variant="onDark">
                Email bia@sa.smu.edu.sg →
              </Button>
              <Button href={LINKS.prospectus} variant="outlineOnDark" external>
                Partnership prospectus (PDF)
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
