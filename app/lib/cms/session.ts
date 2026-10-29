import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CmsError, type Actor } from "./actor";
import { findAccess } from "./people";

/** The signed-in CMS user, with their current role from the database. */
export async function getCurrentActor(): Promise<Actor | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return findAccess(email);
}

/** For admin pages: sends signed-out visitors to the sign-in page. */
export async function requireActorPage(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/admin/login");
  return actor;
}

/** For server actions: throws instead of redirecting. */
export async function requireActor(): Promise<Actor> {
  const actor = await getCurrentActor();
  if (!actor) throw new CmsError("Your session has ended. Sign in again.");
  return actor;
}
