import { can } from "@/app/lib/cms/actor";
import { listGroups } from "@/app/lib/cms/cohorts";
import GroupsEditor from "../../../_run/GroupsEditor";
import { loadRun } from "../../../_run/load";

export default async function GroupsPage(props: { params: Promise<{ run: string }> }) {
  const params = await props.params;
  const { actor, cohort } = await loadRun("DAP", params.run);
  const groups = await listGroups(cohort.id);
  return (
    <GroupsEditor
      key={`${cohort.id}-${groups.map((g) => g.id).join(",")}`}
      cohortId={cohort.id}
      cohortSlug={cohort.slug}
      groups={groups.map((g) => ({ id: g.id, name: g.name, members: g.members, mentors: g.mentors }))}
      canEdit={can.editCohort(actor, "DAP")}
    />
  );
}
