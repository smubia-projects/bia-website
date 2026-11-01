import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { getSiteLinks } from "@/app/lib/cms/links";
import { getLodge, lodgePaths } from "@/app/lib/cms/lodges";
import LodgeEditor from "../../../../_run/LodgeEditor";
import { loadRun } from "../../../../_run/load";

export default async function LodgeEditorPage(props: { params: Promise<{ run: string; id: string }> }) {
  const params = await props.params;
  const { actor, cohort } = await loadRun("AI Lodge", params.run);
  const lodge = await getLodge(Number(params.id));
  if (!lodge || lodge.cohortId !== cohort.id) notFound();
  const [paths, links] = await Promise.all([lodgePaths(), getSiteLinks()]);
  return (
    <LodgeEditor
      key={lodge.updatedAt}
      lodge={lodge}
      cohortSlug={cohort.slug}
      siteHref={`${links.aiLodgeInfosite.replace(/\/$/, "")}${paths.get(lodge.id) ?? `/lodges/${lodge.slug}`}`}
      canEdit={can.editCohort(actor, "AI Lodge")}
    />
  );
}
