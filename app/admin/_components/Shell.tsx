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
  seePeople: boolean;
  reviewCount: number;
  notice?: string;
  children: React.ReactNode;
}

const CRUMBS: [RegExp, string][] = [
  [/^\/admin\/semester/, "AI Lodge › Semester page"],
  [/^\/admin\/projects\/new/, "Projects › New project"],
  [/^\/admin\/projects\/.+/, "Projects › Edit project"],
  [/^\/admin\/projects/, "Projects"],
  [/^\/admin\/newsletter\/.+/, "DAP › Newsletter › Issue"],
  [/^\/admin\/newsletter/, "DAP › Newsletter"],
  [/^\/admin\/sessions/, "DAP › Co-learning sessions"],
  [/^\/admin\/dap-cohort/, "DAP › Cohort page"],
  [/^\/admin\/people/, "Settings › People and roles"],
];

const PUBLIC_FOR: [RegExp, string][] = [
  [/^\/admin\/(semester|projects)/, "/Projects/ai-lodge"],
  [/^\/admin\/(newsletter|sessions)/, "/DAP/newsletter"],
  [/^\/admin\/dap-cohort/, "/DAP/projects"],
];

export default function Shell(props: Props) {
  const pathname = usePathname() ?? "/admin";
  const crumb = CRUMBS.find(([re]) => re.test(pathname))?.[1] ?? "CMS";
  const publicHref = PUBLIC_FOR.find(([re]) => re.test(pathname))?.[1] ?? "/Projects";
  const item = (href: string, label: string, badge?: number) => (
    <Link href={href} className={`${styles.side} ${pathname.startsWith(href) ? styles.sideOn : ""}`}>
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
        {props.seeLodge && (
          <>
            <div className={styles.sideGroup}>AI Lodge</div>
            {item("/admin/semester", "Semester page")}
            {item("/admin/projects", "Projects", props.reviewCount)}
          </>
        )}
        {props.seeDap && (
          <>
            <div className={styles.sideGroup}>DAP</div>
            {item("/admin/newsletter", "Newsletter")}
            {item("/admin/sessions", "Co-learning sessions")}
            {item("/admin/dap-cohort", "Cohort page")}
          </>
        )}
        {props.seePeople && (
          <>
            <div className={styles.sideGroup}>Settings</div>
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
