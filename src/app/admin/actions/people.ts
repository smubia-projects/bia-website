"use server";

import { signOut } from "@/server/auth/auth";
import * as people from "@/server/people/people";
import { run, refreshAdmin } from "./run";

export async function savePersonAction(input: people.PersonInput) {
  return run(async (actor) => {
    await people.savePerson(actor, input);
    refreshAdmin();
    return null;
  }, "Saved");
}

export async function removePersonAction(email: string) {
  return run(async (actor) => {
    await people.removePerson(actor, email);
    refreshAdmin();
    return null;
  }, "Removed");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/login" });
}
