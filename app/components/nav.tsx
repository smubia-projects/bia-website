"use client";
import React, { useState, useEffect } from "react";
import styles from "./nav.module.css";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/WhatWeDo", label: "What We Do" },
  { href: "/DAP", label: "DAP" },
  { href: "/Projects", label: "Projects" },
  { href: "/WorkWithUs", label: "Work with Us" },
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
        <Link href="/" className={styles.logoLink} aria-label="SMUBIA home">
          <Image
            src="/images/logo.png"
            alt="SMUBIA"
            width={120}
            height={32}
            className={styles.logo}
            priority
          />
        </Link>

        <nav className={styles.desktopLinks} aria-label="Main navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${
                isActive(href) ? styles.navLinkActive : ""
              }`}
            >
              {label}
            </Link>
          ))}
          <Link href="/ContactUs#join" className={styles.joinButton}>
            Join us
          </Link>
        </nav>

        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} />
        </button>
      </div>

      {menuOpen && (
        <nav className={styles.mobilePanel} aria-label="Mobile navigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileLink} ${
                isActive(href) ? styles.mobileLinkActive : ""
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/ContactUs#join"
            className={styles.mobileJoinButton}
            onClick={() => setMenuOpen(false)}
          >
            Join us
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
