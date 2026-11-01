"use client";
import React, { useState, useEffect, useRef } from "react";
import styles from "./nav.module.css";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSiteLinks } from "./SiteLinksProvider";
import { MOTION_EASE, motionTransition } from "./ui/motion";

const MotionLink = motion.create(Link);

interface NavItem {
  href: string;
  label: string;
  /** Shown as a dropdown on desktop and an indented list on mobile */
  children?: { href: string; label: string }[];
}

const navLinks = (aiLodgeSite: string): NavItem[] => [
  { href: "/curriculum", label: "Curriculum" },
  { href: "/dap", label: "DAP" },
  // AI Lodge lives on its own site — the internal /AILodge page is kept but unlinked.
  { href: aiLodgeSite, label: "AI Lodge" },
  {
    href: "/projects",
    label: "Projects",
    children: [
      { href: "/projects/ailodge", label: "AI Lodge projects" },
      { href: "/projects/dap", label: "DAP projects" },
      { href: "/projects", label: "All projects" },
    ],
  },
  { href: "/work-with-us", label: "Partners" },
  { href: "/contact-us", label: "Contact" },
];

/** A dropdown child is active on its own pages; "All projects" only on /projects itself. */
const childActive = (pathname: string, parent: string, href: string) =>
  href === parent ? pathname === href : pathname.startsWith(href);

/** Desktop dropdown: opens on hover or click, closes on Escape, blur or an outside click. */
function NavDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const menuId = `nav-menu-${item.label.toLowerCase()}`;

  // Close on navigation (state adjusted during render, not in an effect)
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // A mouse click lands right after the hover that opened the menu; it shouldn't close it.
  const hoverOpenedAt = useRef(0);
  const hold = () => {
    clearTimeout(closeTimer.current);
    if (!open) hoverOpenedAt.current = Date.now();
    setOpen(true);
  };
  const toggle = () => {
    if (Date.now() - hoverOpenedAt.current < 500) return;
    setOpen((o) => !o);
  };
  const release = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      ref={ref}
      className={styles.dropdown}
      onPointerEnter={(e) => e.pointerType === "mouse" && hold()}
      onPointerLeave={(e) => e.pointerType === "mouse" && release()}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <motion.button
        type="button"
        className={`${styles.navLink} ${styles.dropdownToggle} ${active ? styles.navLinkActive : ""}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
        whileHover={{
          color: "var(--emerald-strong)",
          backgroundColor: "rgba(125, 215, 194, 0.12)",
        }}
        whileTap={{ scale: 0.97 }}
        transition={motionTransition.quick}
      >
        {item.label}
        <ChevronDown
          size={15}
          strokeWidth={2}
          aria-hidden="true"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
        />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.ul
            id={menuId}
            className={styles.dropdownPanel}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: MOTION_EASE }}
          >
            {item.children!.map((c) => {
              const on = childActive(pathname, item.href, c.href);
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className={`${styles.dropdownLink} ${on ? styles.navLinkActive : ""}`}
                    aria-current={on ? "page" : undefined}
                  >
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const Navbar = () => {
  const pathname = usePathname();
  const LINKS = useSiteLinks();
  const NAV_LINKS = navLinks(LINKS.aiLodgeInfosite);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile panel whenever the route changes
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // The mobile panel lists dropdown children under their parent's label.
  const mobileEntries = NAV_LINKS.flatMap((item) =>
    item.children
      ? [
          { key: `${item.href}-label`, label: item.label, heading: true as const },
          ...item.children.map((c) => ({
            key: c.href,
            href: c.href,
            label: c.label,
            sub: true,
            active: childActive(pathname, item.href, c.href),
          })),
        ]
      : [{ key: item.href, href: item.href, label: item.label, sub: false, active: isActive(item.href) }]
  );

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
          {NAV_LINKS.map((item) =>
            item.children ? (
              <NavDropdown key={item.href} item={item} active={isActive(item.href)} />
            ) : (
              <MotionLink
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${
                  isActive(item.href) ? styles.navLinkActive : ""
                }`}
                aria-current={isActive(item.href) ? "page" : undefined}
                whileHover={{
                  color: "var(--emerald-strong)",
                  backgroundColor: "rgba(125, 215, 194, 0.12)",
                }}
                whileTap={{ scale: 0.97 }}
                transition={motionTransition.quick}
              >
                {item.label}
              </MotionLink>
            )
          )}
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
          aria-controls="mobile-navigation"
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
            id="mobile-navigation"
            className={styles.mobilePanel}
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.25, ease: MOTION_EASE }}
          >
            {mobileEntries.map((entry, index) =>
              "heading" in entry ? (
                <span key={entry.key} className={styles.mobileGroupLabel}>
                  {entry.label}
                </span>
              ) : (
                <MotionLink
                  key={entry.key}
                  href={entry.href}
                  className={`${styles.mobileLink} ${entry.sub ? styles.mobileSubLink : ""} ${
                    entry.active ? styles.mobileLinkActive : ""
                  }`}
                  aria-current={entry.active ? "page" : undefined}
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
                    color: "var(--emerald-strong)",
                    backgroundColor: "rgba(125, 215, 194, 0.12)",
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {entry.label}
                </MotionLink>
              )
            )}
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
