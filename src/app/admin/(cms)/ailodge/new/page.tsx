import { notFound } from "next/navigation";
import { can } from "@/server/core/actor";
import { listCohorts } from "@/server/cohorts/cohorts";
import { requireActorPage } from "@/server/auth/session";
import NewRunForm from "../../_run/NewRunForm";

export default async function NewRunPage() {
  const actor = await requireActorPage();
  if (!can.seeLodge(actor)) notFound();
  const existing = await listCohorts("AI Lodge");
  return <NewRunForm programme="AI Lodge" canEdit={can.editCohort(actor, "AI Lodge")} isFirst={existing.length === 0} />;
}
