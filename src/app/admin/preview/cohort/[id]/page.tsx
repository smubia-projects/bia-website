import { notFound } from "next/navigation";
import { can } from "@/server/core/permissions";
import { getCohort, listCohorts } from "@/server/cohorts/cohorts";
import { listGroups } from "@/server/dap/colearning-groups";
import { listLodges } from "@/server/ailodge/lodges";
import { listTracks } from "@/server/ailodge/tracks";
import { lodgePaths } from "@/server/ailodge/lodges";
import { listProjects } from "@/server/projects/projects";
import { requireActorPage } from "@/server/auth/session";
import DapYearbookPage from "@/app/projects/dap/DapYearbookPage";
import LodgeYearbook from "@/app/projects/ailodge/LodgeYearbook";
import PreviewBar from "@/app/admin/_components/PreviewBar";
import { runHref } from "@/app/admin/_components/runs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Preview | SMUBIA CMS", robots: { index: false, follow: false } };

/** A semester or cohort yearbook as it will look, including hidden cohorts and draft projects. */
export default async function CohortPreviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const actor = await requireActorPage();
  const cohort = await getCohort(params.id);
  if (!cohort) notFound();
  const isLodge = cohort.programme === "AI Lodge";
  if (isLodge ? !can.seeLodge(actor) : !can.seeDap(actor)) notFound();

  const [all, cohorts, tracks, lodgeRows, groups, paths] = await Promise.all([
    listProjects(),
    listCohorts(cohort.programme),
    listTracks(cohort.id),
    listLodges(cohort.id),
    listGroups(cohort.id),
    lodgePaths(),
  ]);
  const lodges = lodgeRows.map((l) => ({ ...l, path: paths.get(l.id) ?? `/lodges/${l.slug}` }));
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
        note={`${cohort.visibility === "hidden" ? `Hidden ${noun}, not public.` : `Public ${noun}.`}${
          drafts ? ` Includes ${drafts} unpublished ${drafts === 1 ? "project" : "projects"}.` : ""
        }`}
        backHref={runHref(cohort.programme, cohort.slug)}
        backLabel={`Return to ${cohort.name}`}
      />
      {isLodge ? (
        <LodgeYearbook cohort={current} cohorts={[current]} projects={projects} />
      ) : (
        <DapYearbookPage cohort={current} cohorts={[current]} projects={projects} />
      )}
    </>
  );
}
