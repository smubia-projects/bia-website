import { notFound, redirect } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { requireActorPage } from "@/app/lib/cms/session";
import type { Programme } from "@/app/lib/cms/taxonomy";
import { newRunHref, runHref } from "../../_components/runs";

const canSee = (actor: Awaited<ReturnType<typeof requireActorPage>>, programme: Programme) =>
  programme === "AI Lodge" ? can.seeLodge(actor) : can.seeDap(actor);

/** The signed-in actor and the run named in the path; 404 when either doesn't fit. */
export async function loadRun(programme: Programme, slug: string) {
  const actor = await requireActorPage();
  if (!canSee(actor, programme)) notFound();
  const cohorts = await listCohorts(programme);
  const cohort = cohorts.find((c) => c.slug === slug);
  if (!cohort) notFound();
  return { actor, cohorts, cohort };
}

/** /admin/ailodge and /admin/dap open the current run, or the new-run form when there is none. */
export async function redirectToCurrentRun(programme: Programme): Promise<never> {
  const actor = await requireActorPage();
  if (!canSee(actor, programme)) notFound();
  const current = pickCurrentCohort(await listCohorts(programme));
  redirect(current ? runHref(programme, current.slug) : newRunHref(programme));
}
