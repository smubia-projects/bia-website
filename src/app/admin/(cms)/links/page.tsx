import { notFound } from "next/navigation";
import { can } from "@/app/lib/cms/actor";
import { listSiteLinks } from "@/app/lib/cms/links";
import { requireActorPage } from "@/app/lib/cms/session";
import LinksEditor from "./LinksEditor";

export default async function SiteLinksPage() {
  const actor = await requireActorPage();
  if (!can.editLinks(actor)) notFound();
  const links = await listSiteLinks();
  return <LinksEditor links={links} />;
}
