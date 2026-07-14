"use client";
import React, { useState, useEffect } from "react";
import styles from "./nav.module.css";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LINKS } from "@/app/lib/links";
import { MOTION_EASE, motionTransition } from "./ui/motion";

const MotionLink = motion.create(Link);

const NAV_LINKS = [
  { href: "/Curriculum", label: "Curriculum" },
  { href: "/DAP", label: "DAP" },
  // AI Lodge lives on its own site — the internal /AILodge page is kept but unlinked.
  { href: LINKS.aiLodgeInfosite, label: "AI Lodge" },
  { href: "/Projects", label: "Projects" },
  { href: "/WorkWithUs", label: "Partners" },
  { href: "/ContactUs", label: "Contact" },
];

const Navbar = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile panel whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className={styles.navbar}>
      <div className={styles.inner}>
        <MotionLink
          href="/"
          className={styles.logoLink}
          aria-label="SMUBIA home"
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.98 }}
          transition={motionTransition.quick}
        >
          <Image
            src="/images/logo.png"
            alt="SMUBIA"
            width={120}
            height={32}
            className={styles.logo}
            priority
          />
        </MotionLink>

        <nav className={styles.desktopLinks} aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <MotionLink
              key={href}
              href={href}
              className={`${styles.navLink} ${
                isActive(href) ? styles.navLinkActive : ""
              }`}
              whileHover={{
                color: "var(--emerald)",
                backgroundColor: "rgba(125, 215, 194, 0.12)",
              }}
              whileTap={{ scale: 0.97 }}
              transition={motionTransition.quick}
            >
              {label}
            </MotionLink>
          ))}
          <MotionLink
            href={LINKS.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.joinButton}
            whileHover={{
              y: -1,
              backgroundColor: "var(--emerald-strong)",
              boxShadow: "var(--shadow-sm)",
            }}
            whileTap={{ y: 0, scale: 0.98 }}
            transition={motionTransition.quick}
          >
            Join Us
          </MotionLink>
        </nav>

        <motion.button
          className={styles.menuToggle}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          whileHover={{ borderColor: "var(--emerald)" }}
          whileTap={{ scale: 0.94 }}
          transition={motionTransition.quick}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={menuOpen ? "close" : "open"}
              initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
              transition={{ duration: 0.18, ease: MOTION_EASE }}
              className={styles.menuIcon}
            >
              {menuOpen ? (
                <X size={22} strokeWidth={1.75} />
              ) : (
                <Menu size={22} strokeWidth={1.75} />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className={styles.mobilePanel}
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: MOTION_EASE }}
          >
            {NAV_LINKS.map(({ href, label }, index) => (
              <MotionLink
                key={href}
                href={href}
                className={`${styles.mobileLink} ${
                  isActive(href) ? styles.mobileLinkActive : ""
                }`}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.22,
                  delay: index * 0.025,
                  ease: MOTION_EASE,
                }}
                whileHover={{
                  x: 4,
                  color: "var(--emerald)",
                  backgroundColor: "rgba(125, 215, 194, 0.12)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                {label}
              </MotionLink>
            ))}
            <MotionLink
              href={LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mobileJoinButton}
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.15, ease: MOTION_EASE }}
              whileHover={{ backgroundColor: "var(--emerald-strong)" }}
              whileTap={{ scale: 0.98 }}
            >
              Join Us
            </MotionLink>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
