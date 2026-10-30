import { can } from "@/app/lib/cms/actor";
import { getSiteLinks } from "@/app/lib/cms/links";
import { listAllLodges, listLodges, lodgePaths } from "@/app/lib/cms/lodges";
import LodgeList from "../../../_run/LodgeList";
import { loadRun } from "../../../_run/load";

export default async function LodgesPage({ params }: { params: { run: string } }) {
  const { actor, cohorts, cohort } = await loadRun("AI Lodge", params.run);
  const [lodges, all, paths, links] = await Promise.all([listLodges(cohort.id), listAllLodges(), lodgePaths(), getSiteLinks()]);
  const site = links.aiLodgeInfosite.replace(/\/$/, "");
  const others = cohorts
    .filter((c) => c.id !== cohort.id)
    .map((c) => ({ semester: c.name, lodges: all.filter((l) => l.cohortId === c.id).map((l) => ({ id: l.id, name: l.name })) }))
    .filter((o) => o.lodges.length > 0);
  return (
    <LodgeList
      cohortId={cohort.id}
      cohortSlug={cohort.slug}
      archived={cohort.visibility === "archived"}
      lodges={lodges.map((l) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        status: l.status,
        captains: l.captains.length,
        logo: l.logo,
        accent: l.accent,
        href: `${site}${paths.get(l.id) ?? `/lodges/${l.slug}`}`,
      }))}
      others={others}
      canEdit={can.editCohort(actor, "AI Lodge")}
    />
  );
}
