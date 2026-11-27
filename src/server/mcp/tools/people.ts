import "server-only";
import { z } from "zod";
import { CmsError } from "@/server/core/actor";
import * as colearningGroups from "@/server/dap/colearning-groups";
import * as people from "@/server/people/people";
import { LODGE_HEAD_ACCESS_WEEKS, ROLES } from "@/shared/taxonomy";
import { type McpServer, actor, tool } from "@/server/mcp/context";

export function registerPeopleTools(server: McpServer) {
  // ── People (superadmins) ──
  server.registerTool(
    "list_people",
    {
      title: "List people",
      description: "Everyone with CMS access: role, lodges (lodge heads) and the last day of access. Superadmins come from CMS_BOOTSTRAP_ADMINS and aren't listed.",
      inputSchema: z.object({}),
    },
    () =>
      tool(async () => {
        const [list, lodges] = await Promise.all([people.listPeople(), people.lodgeOptions()]);
        return list
          .filter((p) => !p.email.endsWith("@localhost"))
          .map((p) => ({
            email: p.email,
            name: p.name,
            role: p.role,
            lodges: p.lodgeIds.map((id) => {
              const l = lodges.find((x) => x.id === id);
              return l ? { id, name: l.name, semester: l.cohortName } : { id, name: "Removed lodge" };
            }),
            accessEnds: p.accessEnds,
            expired: people.accessExpired(p),
          }));
      })
  );

  server.registerTool(
    "set_person",
    {
      title: "Add or update a person",
      description: `Gives an @smu.edu.sg account CMS access with a role: ${ROLES.join(", ")}. Lodge heads need lodgeIds (from list_cohorts). Leave accessEnds out to use the default: ${LODGE_HEAD_ACCESS_WEEKS} weeks after the latest of their semesters' week 1 (no end if the semester has no start date). Pass null for no end date.`,
      inputSchema: z.object({
        email: z.string(),
        name: z.string().optional(),
        role: z.enum(ROLES),
        lodgeIds: z.array(z.number().int()).optional(),
        accessEnds: z.string().nullable().optional().describe("Last day of access, YYYY-MM-DD (lodge heads)"),
      }),
    },
    (input) => tool(() => people.savePerson(actor(), input))
  );

  server.registerTool(
    "remove_person",
    { title: "Remove a person", description: "Ends a person's CMS access (and their access tokens) immediately.", inputSchema: z.object({ email: z.string() }) },
    ({ email }) => tool(async () => (await people.removePerson(actor(), email), { removed: email }))
  );

  server.registerTool(
    "set_lodge_heads",
    {
      title: "Set a semester's lodge heads",
      description: `Paste-a-table setup for one AI Lodge semester: rows of lodge (name or slug) and email. Each listed lodge's heads become exactly the listed people (others lose that lodge); lodges not listed keep theirs. New people are added as lodge heads. Access ends on the default date, ${LODGE_HEAD_ACCESS_WEEKS} weeks after the semester's week 1 (set startsOn with update_cohort first). Existing exco keep their role and are reported as skipped.`,
      inputSchema: z.object({
        cohortId: z.string().describe("The AI Lodge semester, e.g. ai-lodge-ay2627-s1"),
        heads: z.array(z.object({ lodge: z.string(), email: z.string(), name: z.string().optional() })),
      }),
    },
    ({ cohortId, heads }) => tool(() => people.setLodgeHeads(actor(), cohortId, heads))
  );

  const profile = z.object({
    name: z.string(),
    image: z.string().optional().describe("URL from upload_image (square works best)"),
    linkedin: z.string().optional(),
    email: z.string().optional(),
    telegram: z.string().optional().describe("@handle or t.me link"),
  });

  server.registerTool(
    "get_dap_group",
    { title: "Get DAP group", description: "A DAP co-learning group with its members and mentors.", inputSchema: z.object({ cohortId: z.string(), id: z.number().int() }) },
    ({ cohortId, id }) =>
      tool(async () => (await colearningGroups.listGroups(cohortId)).find((g) => g.id === id) ?? Promise.reject(new CmsError("Group not found")))
  );

  server.registerTool(
    "save_dap_group",
    {
      title: "Create or edit a DAP group",
      description:
        "A DAP cohort's co-learning group, which teaches sessions; project groups are each project's team instead. members and mentors (usually 1 to 3) replace the whole list when given. Pass id to edit; omit it to create.",
      inputSchema: z.object({
        id: z.number().int().optional(),
        cohortId: z.string(),
        name: z.string(),
        members: z.array(profile).optional(),
        mentors: z.array(profile).optional(),
      }),
    },
    (input) => tool(() => colearningGroups.saveGroup(actor(), input))
  );
}
