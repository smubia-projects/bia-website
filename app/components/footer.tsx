"use client";

import React from "react";
import styles from "./footer.module.css";
import Image from "next/image";
import Link from "next/link";
import { Linkedin, Instagram, Send, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { LINKS } from "@/app/lib/links";
import { motionTransition } from "./ui/motion";

const MotionLink = motion.create(Link);

const EXPLORE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/Curriculum", label: "Curriculum" },
  { href: "/DAP", label: "Data Associate Programme" },
  { href: LINKS.aiLodgeInfosite, label: "AI Lodge" },
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
                  <MotionLink
                    href={href}
                    className={styles.footerLink}
                    whileHover={{ color: "var(--mint)", x: 3 }}
                    transition={motionTransition.quick}
                  >
                    {label}
                  </MotionLink>
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
            <motion.a
              href={LINKS.email}
              className={styles.footerLink}
              whileHover={{ color: "var(--mint)", x: 3 }}
              transition={motionTransition.quick}
            >
              bia@sa.smu.edu.sg
            </motion.a>
          </div>

          <div className={styles.column}>
            <h3 className={styles.columnTitle}>Connect</h3>
            <div className={styles.socialRow}>
              <motion.a
                href={LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className={styles.socialIcon}
                whileHover={{
                  y: -2,
                  color: "var(--mint)",
                  borderColor: "var(--mint)",
                }}
                whileTap={{ scale: 0.94 }}
                transition={motionTransition.quick}
              >
                <Linkedin size={18} strokeWidth={1.75} />
              </motion.a>
              <motion.a
                href={LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={styles.socialIcon}
                whileHover={{
                  y: -2,
                  color: "var(--mint)",
                  borderColor: "var(--mint)",
                }}
                whileTap={{ scale: 0.94 }}
                transition={motionTransition.quick}
              >
                <Instagram size={18} strokeWidth={1.75} />
              </motion.a>
              <motion.a
                href={LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className={styles.socialIcon}
                whileHover={{
                  y: -2,
                  color: "var(--mint)",
                  borderColor: "var(--mint)",
                }}
                whileTap={{ scale: 0.94 }}
                transition={motionTransition.quick}
              >
                <Send size={18} strokeWidth={1.75} />
              </motion.a>
              <motion.a
                href={LINKS.email}
                aria-label="Email"
                className={styles.socialIcon}
                whileHover={{
                  y: -2,
                  color: "var(--mint)",
                  borderColor: "var(--mint)",
                }}
                whileTap={{ scale: 0.94 }}
                transition={motionTransition.quick}
              >
                <Mail size={18} strokeWidth={1.75} />
              </motion.a>
            </div>
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
