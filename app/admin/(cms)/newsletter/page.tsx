import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { formatIssueDate, issuePath, listIssues, listSessions } from "@/app/lib/cms/newsletter";
import { requireActorPage } from "@/app/lib/cms/session";
import styles from "../../cms.module.css";
import IssueList from "./IssueList";

export default async function NewsletterAdminPage({ searchParams }: { searchParams: { cohort?: string } }) {
  const actor = await requireActorPage();
  if (!can.seeDap(actor)) notFound();
  const cohorts = await listCohorts("DAP");
  const cohort = cohorts.find((c) => c.id === searchParams.cohort) ?? pickCurrentCohort(cohorts);

  if (!cohort) {
    return (
      <div className={styles.panel} style={{ maxWidth: 560 }}>
        <h1 className={styles.h1} style={{ fontSize: 22 }}>
          No DAP cohort yet
        </h1>
        <p className={styles.sub}>Issues belong to a cohort. Create this year&apos;s cohort first.</p>
        <Link href="/admin/dap-cohort" className={styles.btn} style={{ alignSelf: "flex-start" }}>
          Create a cohort
        </Link>
      </div>
    );
  }

  const [issues, sessions] = await Promise.all([listIssues(cohort.id), listSessions(cohort.id)]);
  const rows = issues.map((i) => {
    const s = sessions.find((x) => x.week === i.week);
    return {
      id: i.id,
      week: i.week,
      title: i.title,
      status: i.status,
      session: s?.topic ? `${s.topic}${s.group ? ` · ${s.group}` : ""}` : "No session set",
      path: i.status === "published" ? issuePath(cohort.slug, i.week) : null,
      goesOut:
        i.status === "published"
          ? formatIssueDate(i.publishedAt)
          : i.status === "scheduled"
            ? `${formatIssueDate(i.publishAt)}, ~9am`
            : "Not scheduled",
    };
  });

  return (
    <IssueList
      cohortId={cohort.id}
      cohortName={cohort.name}
      cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
      rows={rows}
    />
  );
}
