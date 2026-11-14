"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, Send, X } from "lucide-react";
import type { Programme } from "@/app/lib/cms/taxonomy";
import { cohortPath, dapRunPath } from "@/app/lib/cms/paths";
import { signOutAction } from "../actions";
import RunSwitcher from "./RunSwitcher";
import { RUN_COOKIE, RUN_SECTIONS, RUN_SEGMENT, parseRunPath, runHref, type RunOption } from "./runs";
import { ConfirmProvider } from "./ui";
import styles from "../cms.module.css";

interface Props {
  email: string;
  roleLabel: string;
  seeLinks: boolean;
  /** People and Roles: superadmins only */
  seePeople: boolean;
  /** Photos alone (AI Lodge exco edit the AI Lodge site's photos) */
  seePhotos: boolean;
  /** DAP timeline tracker admins link their Telegram account here */
  seeTelegram: boolean;
  reviewCount: number;
  /** Every semester and cohort this person can open */
  runs: RunOption[];
  /** The run the switcher shows outside a run's pages: the last one opened, else the current one */
  defaultRun: RunOption | null;
  canCreate: Record<Programme, boolean>;
  notice?: string;
  children: React.ReactNode;
}

/** The public page that matches the CMS page, for "View Public Site". */
function publicHrefFor(pathname: string, run: RunOption | null) {
  const inRun = parseRunPath(pathname);
  if (inRun && run) {
    if (run.programme === "DAP" && inRun.section !== "projects") return dapRunPath(run.slug);
    return cohortPath(run.programme, run.slug);
  }
  return "/projects";
}

export default function Shell(props: Props) {
  const pathname = usePathname() ?? "/admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const inRun = parseRunPath(pathname);
  const pathRun = inRun ? props.runs.find((r) => r.programme === inRun.programme && r.slug === inRun.slug) ?? null : null;
  const run = pathRun ?? props.defaultRun;
  const section = inRun?.section ?? "";

  // Remember the run, so the switcher keeps showing it on the Dashboard and Settings.
  useEffect(() => {
    if (!pathRun) return;
    document.cookie = `${RUN_COOKIE}=${RUN_SEGMENT[pathRun.programme]}/${pathRun.slug}; path=/admin; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  }, [pathRun]);

  const item = (href: string, label: string, on: boolean, badge?: number) => (
    <Link
      key={href}
      href={href}
      className={`${styles.side} ${on ? styles.sideOn : ""}`}
      aria-current={on ? "page" : undefined}
      onClick={() => setMenuOpen(false)}
    >
      {label}
      {badge ? (
        <span className={styles.sideCount} aria-label={`${badge} in review`} title={`${badge} in review`}>
          {badge}
        </span>
      ) : null}
    </Link>
  );

  return (
    <div className={styles.shell}>
      <ConfirmProvider>
        <aside className={styles.sidebar}>
          <div className={styles.brandRow}>
            <Link href="/admin" className={styles.brand}>
              <Send size={18} strokeWidth={1.75} color="var(--mint)" aria-hidden="true" />
              SMUBIA <span className={styles.brandTag}>CMS</span>
            </Link>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close Menu" : "Open Menu"}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={18} strokeWidth={1.75} aria-hidden="true" />}
            </button>
          </div>
          <nav className={`${styles.sideNav} ${menuOpen ? styles.sideNavOpen : ""}`} aria-label="CMS">
            <div className={styles.sideGroup}>Site</div>
            {item("/admin", "Dashboard", pathname === "/admin")}
            {item("/admin/projects", "All Projects", pathname.startsWith("/admin/projects"), props.reviewCount)}

            {(props.runs.length > 0 || props.canCreate["AI Lodge"] || props.canCreate.DAP) && (
              <>
                <div className={styles.sideGroup}>Programme</div>
                <RunSwitcher runs={props.runs} current={run} section={section} canCreate={props.canCreate} />
                {run &&
                  RUN_SECTIONS[run.programme].map((s) =>
                    item(
                      runHref(run.programme, run.slug, s.key),
                      s.label,
                      Boolean(pathRun) && pathRun === run && (s.key ? section === s.key : section === "")
                    )
                  )}
              </>
            )}

            <div className={styles.sideGroup}>Settings</div>
            {props.seeLinks && item("/admin/links", "Site Links", pathname.startsWith("/admin/links"))}
            {props.seePhotos && item("/admin/photos", "Photos", pathname.startsWith("/admin/photos"))}
            {props.seePeople && item("/admin/people", "People and Roles", pathname.startsWith("/admin/people"))}
            {props.seeTelegram && item("/admin/telegram", "Telegram", pathname.startsWith("/admin/telegram"))}
            {item("/admin/tokens", "Access Tokens", pathname.startsWith("/admin/tokens"))}

            <div className={styles.sideFoot}>
              <a className={styles.side} href={publicHrefFor(pathname, pathRun)} target="_blank" rel="noopener noreferrer">
                View Public Site
                <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
              </a>
              <div className={styles.signedIn}>
                {props.roleLabel}
                <strong>{props.email}</strong>
                <form action={signOutAction}>
                  <button type="submit" className={styles.signOut}>
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </nav>
        </aside>

        <div className={styles.work}>
          <main className={styles.main}>
            {props.notice && <div className={styles.notice}>{props.notice}</div>}
            {props.children}
          </main>
        </div>
      </ConfirmProvider>
    </div>
  );
}
