"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../actions";
import styles from "../cms.module.css";

interface Props {
  email: string;
  roleLabel: string;
  seeLodge: boolean;
  seeDap: boolean;
  seeSettings: boolean;
  reviewCount: number;
  notice?: string;
  children: React.ReactNode;
}

const CRUMBS: [RegExp, string][] = [
  [/^\/admin\/semester/, "AI Lodge › Semesters"],
  [/^\/admin\/projects\/new/, "Projects › New project"],
  [/^\/admin\/projects\/.+/, "Projects › Edit project"],
  [/^\/admin\/projects/, "Projects"],
  [/^\/admin\/newsletter\/.+/, "DAP › Newsletter › Issue"],
  [/^\/admin\/newsletter/, "DAP › Newsletter"],
  [/^\/admin\/sessions/, "DAP › Co-learning sessions"],
  [/^\/admin\/dap-cohort/, "DAP › Cohorts"],
  [/^\/admin\/groups/, "DAP › Groups"],
  [/^\/admin\/links/, "Settings › Site links"],
  [/^\/admin\/people/, "Settings › People and roles"],
  [/^\/admin$/, "Home"],
];

const PUBLIC_FOR: [RegExp, string][] = [
  [/^\/admin\/projects/, "/projects"],
  [/^\/admin\/semester/, "/projects/ailodge"],
  [/^\/admin\/(newsletter|sessions)/, "/dap/newsletter"],
  [/^\/admin\/groups/, "/dap"],
  [/^\/admin\/dap-cohort/, "/dap/projects"],
];

export default function Shell(props: Props) {
  const pathname = usePathname() ?? "/admin";
  const crumb = CRUMBS.find(([re]) => re.test(pathname))?.[1] ?? "CMS";
  const publicHref = PUBLIC_FOR.find(([re]) => re.test(pathname))?.[1] ?? "/projects";
  const item = (href: string, label: string, badge?: number) => (
    <Link href={href} className={`${styles.side} ${(href === "/admin" ? pathname === href : pathname.startsWith(href)) ? styles.sideOn : ""}`}>
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
        <div className={styles.sideGroup}>Content</div>
        {item("/admin", "Home")}
        {item("/admin/projects", "Projects", props.reviewCount)}
        {props.seeLodge && (
          <>
            <div className={styles.sideGroup}>AI Lodge</div>
            {item("/admin/semester", "Semesters")}
          </>
        )}
        {props.seeDap && (
          <>
            <div className={styles.sideGroup}>DAP</div>
            {item("/admin/dap-cohort", "Cohorts")}
            {item("/admin/groups", "Groups")}
            {item("/admin/newsletter", "Newsletter")}
            {item("/admin/sessions", "Co-learning sessions")}
          </>
        )}
        {props.seeSettings && (
          <>
            <div className={styles.sideGroup}>Settings</div>
            {item("/admin/links", "Site links")}
            {item("/admin/people", "People and roles")}
          </>
        )}
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
          <a className={styles.pill} href={publicHref} target="_blank" rel="noopener noreferrer">
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
