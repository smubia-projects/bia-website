"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Programme } from "@/app/lib/cms/taxonomy";
import { cohortPath, dapRunPath } from "@/app/lib/cms/paths";
import { signOutAction } from "../actions";
import RunSwitcher from "./RunSwitcher";
import { RUN_COOKIE, RUN_SECTIONS, RUN_SEGMENT, parseRunPath, runHref, type RunOption } from "./runs";
import styles from "../cms.module.css";

interface Props {
  email: string;
  roleLabel: string;
  seeSettings: boolean;
  /** Photos alone (AI Lodge exco edit the AI Lodge site's photos) */
  seePhotos: boolean;
  reviewCount: number;
  /** Every semester and cohort this person can open */
  runs: RunOption[];
  /** The run the switcher shows outside a run's pages: the last one opened, else the current one */
  defaultRun: RunOption | null;
  canCreate: Record<Programme, boolean>;
  notice?: string;
  children: React.ReactNode;
}

const TOP_CRUMBS: [RegExp, string][] = [
  [/^\/admin\/projects\/new/, "Projects › New project"],
  [/^\/admin\/projects\/.+/, "Projects › Edit project"],
  [/^\/admin\/projects/, "All projects"],
  [/^\/admin\/(ailodge|dap)\/new/, "New run"],
  [/^\/admin\/links/, "Settings › Site links"],
  [/^\/admin\/photos/, "Settings › Photos"],
  [/^\/admin\/people/, "Settings › People and roles"],
  [/^\/admin\/tokens/, "Settings › Access tokens"],
  [/^\/admin$/, "Home"],
];

/** The public page that matches the CMS page, for "View public site". */
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
  const inRun = parseRunPath(pathname);
  const pathRun = inRun ? props.runs.find((r) => r.programme === inRun.programme && r.slug === inRun.slug) ?? null : null;
  const run = pathRun ?? props.defaultRun;
  const section = inRun?.section ?? "";

  // Remember the run, so the switcher keeps showing it on Home and Settings.
  useEffect(() => {
    if (!pathRun) return;
    document.cookie = `${RUN_COOKIE}=${RUN_SEGMENT[pathRun.programme]}/${pathRun.slug}; path=/admin; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  }, [pathRun]);

  const crumb = pathRun
    ? `${pathRun.programme} · ${pathRun.name}${section ? ` › ${RUN_SECTIONS[pathRun.programme].find((s) => s.key === section)?.label ?? ""}` : ""}`
    : TOP_CRUMBS.find(([re]) => re.test(pathname))?.[1] ?? "CMS";

  const item = (href: string, label: string, on: boolean, badge?: number) => (
    <Link key={href} href={href} className={`${styles.side} ${on ? styles.sideOn : ""}`} aria-current={on ? "page" : undefined}>
      {label}
      {badge ? <span className={styles.sideBadge}>{badge} to review</span> : null}
    </Link>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7dd7c2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
          SMUBIA <span className={styles.brandTag}>CMS</span>
        </Link>
        <div className={styles.sideGroup}>Site</div>
        {item("/admin", "Home", pathname === "/admin")}
        {item("/admin/projects", "All projects", pathname.startsWith("/admin/projects"), props.reviewCount)}

        {(props.runs.length > 0 || props.canCreate["AI Lodge"] || props.canCreate.DAP) && (
          <>
            <div className={styles.sideGroup}>Semester or cohort</div>
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
        {props.seeSettings && item("/admin/links", "Site links", pathname.startsWith("/admin/links"))}
        {props.seePhotos && item("/admin/photos", "Photos", pathname.startsWith("/admin/photos"))}
        {props.seeSettings && item("/admin/people", "People and roles", pathname.startsWith("/admin/people"))}
        {item("/admin/tokens", "Access tokens", pathname.startsWith("/admin/tokens"))}
        <div className={styles.signedIn}>
          Signed in as {props.roleLabel}
          <strong>{props.email}</strong>
          <form action={signOutAction}>
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.work}>
        <div className={styles.topbar}>
          <span className={styles.crumb}>{crumb}</span>
          <a className={styles.pill} href={publicHrefFor(pathname, pathRun)} target="_blank" rel="noopener noreferrer">
            View public site
          </a>
        </div>
        <main className={styles.main}>
          {props.notice && <div className={styles.notice}>{props.notice}</div>}
          {props.children}
        </main>
      </div>
    </div>
  );
}
