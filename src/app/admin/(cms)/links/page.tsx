import { notFound } from "next/navigation";
import { can } from "@/server/core/permissions";
import { listSiteLinks } from "@/server/site/links";
import { requireActorPage } from "@/server/auth/session";
import LinksEditor from "./LinksEditor";

export default async function SiteLinksPage() {
  const actor = await requireActorPage();
  if (!can.editLinks(actor)) notFound();
  const links = await listSiteLinks();
  return <LinksEditor links={links} />;
}
