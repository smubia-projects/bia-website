import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, listGroups, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { requireActorPage } from "@/app/lib/cms/session";
import styles from "../../cms.module.css";
import GroupsEditor from "./GroupsEditor";

export default async function GroupsPage({ searchParams }: { searchParams: { cohort?: string } }) {
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
        <p className={styles.sub}>Groups belong to a cohort. Create this year&apos;s cohort first.</p>
        <Link href="/admin/dap-cohort" className={styles.btn} style={{ alignSelf: "flex-start" }}>
          Create a cohort
        </Link>
      </div>
    );
  }
  const groups = await listGroups(cohort.id);
  return (
    <GroupsEditor
      key={`${cohort.id}-${groups.map((g) => g.id).join(",")}`}
      cohortId={cohort.id}
      cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
      groups={groups.map((g) => ({ id: g.id, name: g.name, members: g.members, mentors: g.mentors }))}
      canEdit={can.editCohort(actor, "DAP")}
    />
  );
}
