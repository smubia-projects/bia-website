import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { getCohort, listCohorts, listGroups, listLodges, listTracks } from "@/app/lib/cms/cohorts";
import { listProjects } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import DapYearbookPage from "@/app/dap/projects/DapYearbookPage";
import LodgeYearbook from "@/app/projects/ailodge/LodgeYearbook";
import PreviewBar from "../../../_components/PreviewBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview | SMUBIA CMS", robots: { index: false, follow: false } };

/** A semester or cohort yearbook as it will look, including hidden cohorts and draft projects. */
export default async function CohortPreviewPage({ params }: { params: { id: string } }) {
  const actor = await requireActorPage();
  const cohort = await getCohort(params.id);
  if (!cohort) notFound();
  const isLodge = cohort.programme === "AI Lodge";
  if (isLodge ? !can.seeLodge(actor) : !can.seeDap(actor)) notFound();

  const [all, cohorts, tracks, lodges, groups] = await Promise.all([
    listProjects(),
    listCohorts(cohort.programme),
    listTracks(cohort.id),
    listLodges(cohort.id),
    listGroups(cohort.id),
  ]);
  const projects = all.filter((p) => p.badge === cohort.programme);
  const drafts = projects.filter((p) => p.cohortId === cohort.id && p.status !== "published").length;
  const withTracks = cohorts.map((c) =>
    c.id === cohort.id ? { ...c, tracks, lodges, groups } : { ...c, tracks: [], lodges: [], groups: [] }
  );
  const current = withTracks.find((c) => c.id === cohort.id)!;
  const noun = isLodge ? "semester" : "cohort";

  return (
    <>
      <PreviewBar
        note={`${cohort.visibility === "hidden" ? `This ${noun} is hidden from the site.` : `This ${noun} is live.`}${
          drafts ? ` Includes ${drafts} unpublished ${drafts === 1 ? "project" : "projects"}.` : ""
        }`}
        backHref={`${isLodge ? "/admin/semester" : "/admin/dap-cohort"}?cohort=${cohort.id}`}
        backLabel={`Back to ${isLodge ? "Semesters" : "Cohorts"}`}
      />
      {isLodge ? (
        <LodgeYearbook cohort={current} cohorts={[current]} projects={projects} />
      ) : (
        <DapYearbookPage cohort={current} cohorts={[current]} projects={projects} />
      )}
    </>
  );
}
