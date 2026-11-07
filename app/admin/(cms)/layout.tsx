import { cookies } from "next/headers";
import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { countProjectsInReview } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import { ROLE_LABEL, SUPERADMIN_LABEL } from "@/app/lib/cms/taxonomy";
import { RUN_COOKIE, RUN_SEGMENT, type RunOption } from "../_components/runs";
import Shell from "../_components/Shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CMS | SMUBIA",
  robots: { index: false, follow: false },
};

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActorPage();
  const [reviewCount, cohorts] = await Promise.all([can.publishProject(actor) ? countProjectsInReview() : 0, listCohorts()]);

  const visible = cohorts.filter((c) => (c.programme === "AI Lodge" ? can.seeLodge(actor) : can.seeDap(actor)));
  const runs: RunOption[] = visible.map((c) => ({ programme: c.programme, slug: c.slug, name: c.name, visibility: c.visibility }));
  const remembered = (await cookies()).get(RUN_COOKIE)?.value;
  const current = pickCurrentCohort(visible.filter((c) => c.programme === "AI Lodge")) ?? pickCurrentCohort(visible);
  const defaultRun =
    runs.find((r) => `${RUN_SEGMENT[r.programme]}/${r.slug}` === remembered) ??
    runs.find((r) => r.programme === current?.programme && r.slug === current.slug) ??
    null;

  return (
    <Shell
      email={actor.email}
      roleLabel={actor.superadmin ? SUPERADMIN_LABEL : ROLE_LABEL[actor.role]}
      seeLinks={can.editLinks(actor)}
      seePeople={can.managePeople(actor)}
      seePhotos={can.seePhotos(actor)}
      reviewCount={reviewCount}
      runs={runs}
      defaultRun={defaultRun}
      canCreate={{ "AI Lodge": can.editCohort(actor, "AI Lodge"), DAP: can.editCohort(actor, "DAP") }}
    >
      {children}
    </Shell>
  );
}
