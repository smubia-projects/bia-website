import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { accessExpired, bootstrapAdmins, listPeople, lodgeOptions } from "@/app/lib/cms/people";
import { requireActorPage } from "@/app/lib/cms/session";
import PeopleManager from "./PeopleManager";

export default async function PeoplePage() {
  const actor = await requireActorPage();
  if (!can.managePeople(actor)) notFound();
  const [people, lodges] = await Promise.all([listPeople(), lodgeOptions()]);
  const superadmins = bootstrapAdmins();
  return (
    <PeopleManager
      me={actor.email}
      superadmins={superadmins}
      lodges={lodges.map((l) => ({ id: l.id, name: l.name, cohortId: l.cohortId, cohortName: l.cohortName, startsOn: l.startsOn }))}
      people={people
        .filter((p) => !p.email.endsWith("@localhost") && !superadmins.includes(p.email))
        .map((p) => ({
          email: p.email,
          name: p.name,
          role: p.role,
          lodgeIds: p.lodgeIds,
          accessEnds: p.accessEnds,
          expired: accessExpired(p),
        }))}
    />
  );
}
