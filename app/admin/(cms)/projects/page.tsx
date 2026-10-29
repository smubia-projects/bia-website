import { can } from "@/app/lib/cms/actor";
import { listAllTracks } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import ProjectsTable from "./ProjectsTable";

export default async function AdminProjectsPage({ searchParams }: { searchParams: { track?: string } }) {
  const actor = await requireActorPage();
  const [all, tracks] = await Promise.all([listProjects(), listAllTracks()]);
  let projects = all.filter((p) => can.editProject(actor, { programme: p.badge, trackId: p.trackId ?? null }));
  const trackId = Number(searchParams.track);
  const track = trackId ? tracks.find((t) => t.id === trackId) : undefined;
  if (track) projects = projects.filter((p) => p.trackId === track.id);

  const own = actor.trackId ? tracks.find((t) => t.id === actor.trackId) : undefined;
  const subtitle =
    actor.role === "lodge_head"
      ? `${own?.name ?? "Your track"} · ${projects.length} projects you can edit`
      : actor.role === "dap_editor"
        ? `${projects.length} DAP projects`
        : `${all.length} projects across AI Lodge and DAP`;

  return (
    <ProjectsTable
      projects={projects}
      subtitle={subtitle}
      canApprove={can.publishProject(actor)}
      trackFilter={track ? { id: track.id, name: `${track.name} (${track.cohortName})` } : null}
    />
  );
}
