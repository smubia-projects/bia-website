"use server";

import { createToken, revokeToken } from "@/server/people/tokens";
import { run } from "./run";

/** Returns the token itself, once. */
export async function createTokenAction(name: string, days: number) {
  return run(async (actor) => (await createToken(actor, { name, days })).token);
}

export async function revokeTokenAction(id: number) {
  return run(async (actor) => {
    await revokeToken(actor, id);
    return null;
  });
}
