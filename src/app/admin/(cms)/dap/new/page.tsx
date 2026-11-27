import { notFound } from "next/navigation";
import { can } from "@/server/core/actor";
import { listCohorts } from "@/server/cohorts/cohorts";
import { requireActorPage } from "@/server/auth/session";
import NewRunForm from "../../_run/NewRunForm";

export default async function NewRunPage() {
  const actor = await requireActorPage();
  if (!can.seeDap(actor)) notFound();
  const existing = await listCohorts("DAP");
  return <NewRunForm programme="DAP" canEdit={can.editCohort(actor, "DAP")} isFirst={existing.length === 0} />;
}
