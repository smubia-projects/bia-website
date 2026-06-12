import React from "react";
import styles from "./footer.module.css";
import Image from "next/image";
import Link from "next/link";
import { FaLinkedin, FaInstagram, FaTelegram, FaEnvelope } from "react-icons/fa";
import { LINKS } from "@/app/lib/links";

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/WhatWeDo", label: "What We Do" },
  { href: "/DAP", label: "Data Associate Programme" },
  { href: "/Projects", label: "Projects" },
  { href: "/WorkWithUs", label: "Work with Us" },
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
                <FaLinkedin />
              </a>
              <a
                href={LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={styles.socialIcon}
              >
                <FaInstagram />
              </a>
              <a
                href={LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className={styles.socialIcon}
              >
                <FaTelegram />
              </a>
              <a
                href={LINKS.email}
                aria-label="Email"
                className={styles.socialIcon}
              >
                <FaEnvelope />
              </a>
            </div>
            <a
              href={LINKS.prospectus}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.prospectusLink}
            >
              Download our prospectus →
            </a>
          </div>
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
