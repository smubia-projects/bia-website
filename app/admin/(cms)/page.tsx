import { redirect } from "next/navigation";
import { requireActorPage } from "@/app/lib/cms/session";

export default async function AdminHome() {
  const actor = await requireActorPage();
  redirect(actor.role === "dap_editor" ? "/admin/newsletter" : "/admin/projects");
}
