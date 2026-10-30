import { can } from "@/app/lib/cms/actor";
import { listAllTracks, listCohorts } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import { ROLE_PROGRAMME } from "@/app/lib/cms/taxonomy";
import ProjectsTable from "./ProjectsTable";

export default async function AdminProjectsPage({ searchParams }: { searchParams: { track?: string; cohort?: string } }) {
  const actor = await requireActorPage();
  const [all, tracks, cohorts] = await Promise.all([listProjects(), listAllTracks(), listCohorts()]);
  let projects = all.filter((p) => can.editProject(actor, { programme: p.badge }));
  const trackId = Number(searchParams.track);
  const track = trackId ? tracks.find((t) => t.id === trackId) : undefined;
  if (track) projects = projects.filter((p) => p.trackId === track.id);

  const subtitle =
    ROLE_PROGRAMME[actor.role] ? `${projects.length} ${ROLE_PROGRAMME[actor.role]} projects` : `${all.length} projects across AI Lodge and DAP`;

  return (
    <ProjectsTable
      projects={projects}
      subtitle={subtitle}
      canApprove={can.publishProject(actor)}
      trackFilter={track ? { id: track.id, name: `${track.name} (${track.cohortName})` } : null}
      cohorts={cohorts
        .filter((c) => can.editCohort(actor, c.programme))
        .map((c) => ({ id: c.id, name: c.name, programme: c.programme }))}
      initialCohort={searchParams.cohort ?? ""}
    />
  );
}
