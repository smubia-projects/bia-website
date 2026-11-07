import { can } from "@/app/lib/cms/actor";
import { listAllLodges, listAllTracks, listCohorts } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import { ROLE_PROGRAMME } from "@/app/lib/cms/taxonomy";
import ProjectsTable from "./ProjectsTable";

export default async function AdminProjectsPage(props: {
  searchParams: Promise<{ track?: string; lodge?: string; cohort?: string; status?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const actor = await requireActorPage();
  const [all, tracks, cohorts, lodges] = await Promise.all([listProjects(), listAllTracks(), listCohorts(), listAllLodges()]);
  const projects = all.filter((p) => can.seeProject(actor, { programme: p.badge, lodgeId: p.lodgeId }));
  const head = actor.role === "lodge_head";

  const subtitle = head
    ? `${projects.length} projects in your lodges`
    : ROLE_PROGRAMME[actor.role]
      ? `${projects.length} ${ROLE_PROGRAMME[actor.role]} projects`
      : `${all.length} projects across AI Lodge and DAP`;

  // A lodge head's semesters are those of their lodges.
  const seen = new Set(lodges.filter((l) => actor.lodgeIds?.includes(l.id)).map((l) => l.cohortId));
  return (
    <ProjectsTable
      projects={projects}
      subtitle={subtitle}
      canApprove={can.publishProject(actor)}
      cohorts={cohorts
        .filter((c) => (head ? seen.has(c.id) : can.editCohort(actor, c.programme)))
        .map((c) => ({ id: c.id, name: c.name, programme: c.programme }))}
      tracks={tracks.map((t) => ({ id: t.id, name: t.name, cohortId: t.cohortId }))}
      initialCohort={searchParams.cohort ?? ""}
      initialTrack={searchParams.track ?? ""}
      initialLodge={searchParams.lodge ?? ""}
      initialStatus={searchParams.status ?? ""}
      initialQuery={searchParams.q ?? ""}
    />
  );
}
