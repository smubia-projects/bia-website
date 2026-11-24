import type { Actor } from "@/app/lib/cms/actor";

/** The five ways into the CMS, in the order the permission tables list them. */
export const ROLE_KEYS = ["exco", "superadmin", "dap_exco", "lodge_exco", "lodge_head"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

/** An actor for each role. A lodge head heads the given lodges. */
export function actorFor(key: RoleKey, lodgeIds: number[] = []): Actor {
  switch (key) {
    case "superadmin":
      return { email: "super@smu.edu.sg", name: "Super", role: "exco", superadmin: true };
    case "lodge_head":
      return { email: "head@smu.edu.sg", name: "Head", role: "lodge_head", lodgeIds };
    default:
      return { email: `${key}@smu.edu.sg`, name: key, role: key };
  }
}
