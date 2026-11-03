import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listPeople } from "@/app/lib/cms/people";
import { requireActorPage } from "@/app/lib/cms/session";
import { ROLE_PROGRAMME } from "@/app/lib/cms/taxonomy";
import PeopleManager from "./PeopleManager";

export default async function PeoplePage() {
  const actor = await requireActorPage();
  if (!can.managePeople(actor)) notFound();
  const people = await listPeople();
  const listed = new Set(people.map((p) => p.email));
  const bootstrap = (process.env.CMS_BOOTSTRAP_ADMINS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && !listed.has(e));
  return (
    <PeopleManager
      me={actor.email}
      bootstrap={bootstrap}
      people={people
        .filter((p) => !p.email.endsWith("@localhost"))
        .map((p) => ({
          email: p.email,
          name: p.name,
          role: p.role,
          scope: ROLE_PROGRAMME[p.role] ?? "All programmes",
        }))}
    />
  );
}
