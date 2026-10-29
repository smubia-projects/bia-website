import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listAllTracks } from "@/app/lib/cms/cohorts";
import { listPeople } from "@/app/lib/cms/people";
import { requireActorPage } from "@/app/lib/cms/session";
import PeopleManager from "./PeopleManager";

export default async function PeoplePage() {
  const actor = await requireActorPage();
  if (!can.managePeople(actor)) notFound();
  const [people, tracks] = await Promise.all([listPeople(), listAllTracks()]);
  const listed = new Set(people.map((p) => p.email));
  const bootstrap = (process.env.CMS_BOOTSTRAP_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && !listed.has(e));
  return (
    <PeopleManager
      me={actor.email}
      bootstrap={bootstrap}
      tracks={tracks.map((t) => ({ id: t.id, label: `${t.name} · ${t.cohortName}` }))}
      people={people
        .filter((p) => !p.email.endsWith("@localhost"))
        .map((p) => ({
          email: p.email,
          name: p.name,
          role: p.role,
          trackId: p.trackId,
          scope: p.role === "lodge_head" ? (p.trackName ? `${p.trackName} · ${p.cohortName}` : "No track") : p.role === "dap_editor" ? "DAP" : "Everything",
        }))}
    />
  );
}
