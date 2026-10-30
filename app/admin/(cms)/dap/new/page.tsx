import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts } from "@/app/lib/cms/cohorts";
import { requireActorPage } from "@/app/lib/cms/session";
import NewRunForm from "../../_run/NewRunForm";

export default async function NewRunPage() {
  const actor = await requireActorPage();
  if (!can.seeDap(actor)) notFound();
  const existing = await listCohorts("DAP");
  return <NewRunForm programme="DAP" canEdit={can.editCohort(actor, "DAP")} isFirst={existing.length === 0} />;
}
