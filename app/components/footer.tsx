import React from "react";
import styles from "./footer.module.css";
import Image from "next/image";
import Link from "next/link";
import { Linkedin, Instagram, Send, Mail } from "lucide-react";
import { LINKS } from "@/app/lib/links";

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/Events", label: "Events" },
  { href: "/DAP", label: "Data Associate Programme" },
  { href: "/AILodge", label: "AI Lodge" },
  { href: "/Projects", label: "Projects" },
  { href: "/WorkWithUs", label: "Work With Us" },
  { href: "/ContactUs", label: "Contact" },
];

function FooterBar() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brandColumn}>
            <Image
              src="/images/logo.png"
              alt="SMUBIA"
              width={140}
              height={37}
              className={styles.logo}
            />
            <p className={styles.blurb}>
              SMU&apos;s home for data analytics, AI and machine learning —
              open to all backgrounds since 2015.
            </p>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Explore</h3>
            <ul className={styles.linkList}>
              {EXPLORE_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className={styles.footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Find us</h3>
            <p className={styles.address}>
              Singapore Management University
              <br />
              Level 5, SMU Connexion
              <br />
              40 Stamford Road
              <br />
              Singapore 178908
            </p>
            <a href={LINKS.email} className={styles.footerLink}>
              bia@sa.smu.edu.sg
            </a>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Connect</h3>
            <div className={styles.socialRow}>
              <a
                href={LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className={styles.socialIcon}
              >
                <Linkedin size={18} strokeWidth={1.75} />
              </a>
              <a
                href={LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={styles.socialIcon}
              >
                <Instagram size={18} strokeWidth={1.75} />
              </a>
              {/* TODO: restore target="_blank" when LINKS.telegram is the real invite */}
              <a
                href={LINKS.telegram}
                aria-label="Telegram"
                className={styles.socialIcon}
              >
                <Send size={18} strokeWidth={1.75} />
              </a>
              <a
                href={LINKS.email}
                aria-label="Email"
                className={styles.socialIcon}
              >
                <Mail size={18} strokeWidth={1.75} />
              </a>
            </div>
          </div>
        </div>

        <div className={styles.watermark} aria-hidden="true">
          SMUBIA
        </div>

        <div className={styles.bottomBar}>
          <span>
            © {new Date().getFullYear()} SMU Business Intelligence &amp;
            Analytics Club
          </span>
          <span className={styles.est}>est. 2015</span>
        </div>
      </div>
    </footer>
  );
}

export default FooterBar;
