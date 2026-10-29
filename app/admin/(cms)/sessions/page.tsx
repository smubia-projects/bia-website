import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { listIssues, listSessions } from "@/app/lib/cms/newsletter";
import { requireActorPage } from "@/app/lib/cms/session";
import styles from "../../cms.module.css";
import SessionsEditor from "./SessionsEditor";

export default async function SessionsPage({ searchParams }: { searchParams: { cohort?: string } }) {
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
        <p className={styles.sub}>The co-learning schedule belongs to a cohort. Create this year&apos;s cohort first.</p>
        <Link href="/admin/dap-cohort" className={styles.btn} style={{ alignSelf: "flex-start" }}>
          Create a cohort
        </Link>
      </div>
    );
  }
  const [sessions, issues] = await Promise.all([listSessions(cohort.id), listIssues(cohort.id)]);
  return (
    <SessionsEditor
      key={cohort.id}
      cohortId={cohort.id}
      cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
      initial={sessions.map((s) => ({
        week: s.week,
        topic: s.topic,
        group: s.group,
        slides: s.slides,
        issue: issues.find((i) => i.week === s.week)?.status ?? null,
      }))}
    />
  );
}
