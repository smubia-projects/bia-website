import { can } from "@/app/lib/cms/actor";
import { listCohorts, pickCurrentCohort } from "@/app/lib/cms/cohorts";
import { listIssues } from "@/app/lib/cms/newsletter";
import { listProjects } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import AdminHome from "./AdminHome";

export default async function AdminHomePage() {
  const actor = await requireActorPage();
  const [all, lodgeCohorts, dapCohorts] = await Promise.all([listProjects(), listCohorts("AI Lodge"), listCohorts("DAP")]);
  const mine = all.filter((p) => can.seeProject(actor, { programme: p.badge, lodgeId: p.lodgeId }));
  const dapCohort = can.seeDap(actor) ? pickCurrentCohort(dapCohorts) : null;
  const issues = dapCohort ? await listIssues(dapCohort.id) : [];
  const semester = can.seeLodge(actor) ? pickCurrentCohort(lodgeCohorts) : null;

  return (
    <AdminHome
      canApprove={can.publishProject(actor)}
      review={mine.filter((p) => p.status === "in_review")}
      recent={[...mine].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 5)}
      drafts={mine.filter((p) => p.status === "draft").length}
      noCohort={mine.filter((p) => !p.cohortId).length}
      semester={semester ? { slug: semester.slug, name: semester.name, projects: all.filter((p) => p.cohortId === semester.id).length } : null}
      newsletter={
        dapCohort
          ? {
              cohortSlug: dapCohort.slug,
              cohortName: dapCohort.name,
              latest: issues.filter((i) => i.status === "published").sort((a, b) => b.week - a.week)[0] ?? null,
              scheduled: issues.filter((i) => i.status === "scheduled").sort((a, b) => a.week - b.week)[0] ?? null,
              drafts: issues.filter((i) => i.status === "draft").length,
            }
          : null
      }
    />
  );
}
