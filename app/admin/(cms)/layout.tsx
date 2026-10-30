import { can } from "@/app/lib/cms/actor";
import { listProjects } from "@/app/lib/cms/projects";
import { requireActorPage } from "@/app/lib/cms/session";
import { ROLE_LABEL } from "@/app/lib/cms/taxonomy";
import Shell from "../_components/Shell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CMS | SMUBIA",
  robots: { index: false, follow: false },
};

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActorPage();
  const reviewCount = can.publishProject(actor)
    ? (await listProjects()).filter((p) => p.status === "in_review").length
    : 0;
  return (
    <Shell
      email={actor.email}
      roleLabel={ROLE_LABEL[actor.role]}
      seeLodge={can.seeLodge(actor)}
      seeDap={can.seeDap(actor)}
      seeSettings={can.managePeople(actor)}
      reviewCount={reviewCount}
    >
      {children}
    </Shell>
  );
}
