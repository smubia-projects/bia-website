import { z } from "zod";
import { CmsError } from "@/server/core/actor";
import { can } from "@/server/core/permissions";
import * as projects from "@/server/projects/projects";
import { projectPath } from "@/shared/paths";
import { PROGRAMMES, PROJECT_STATUSES } from "@/shared/taxonomy";
import { uploadImageFromBase64, uploadImageFromUrl } from "@/server/integrations/blob/uploads";
import { type McpServer, actor, tool } from "../context";
import { projectFields } from "../schemas";

export function registerProjectsTools(server: McpServer) {
  // ── Projects ──
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "Projects you can see (any status), optionally filtered. Lodge heads see their own lodges' projects.",
      inputSchema: z.object({
        programme: z.enum(PROGRAMMES).optional(),
        cohortId: z.string().optional(),
        lodgeId: z.number().int().optional(),
        trackId: z.number().int().optional(),
        status: z.enum(PROJECT_STATUSES).optional(),
        query: z.string().optional().describe("Matches title or description"),
      }),
    },
    ({ programme, cohortId, lodgeId, trackId, status, query }) =>
      tool(async () => {
        const q = query?.toLowerCase();
        return (await projects.listProjects())
          .filter((p) => can.seeProject(actor(), { programme: p.badge, lodgeId: p.lodgeId }))
          .filter((p) => (!programme || p.badge === programme) && (!cohortId || p.cohortId === cohortId) && (!status || p.status === status))
          .filter((p) => (!lodgeId || p.lodgeId === lodgeId) && (!trackId || p.trackId === trackId))
          .filter((p) => !q || `${p.title} ${p.description}`.toLowerCase().includes(q))
          .map((p) => ({ slug: p.slug, title: p.title, programme: p.badge, cohort: p.cohortName, track: p.trackName, lodge: p.lodgeName, status: p.status, winner: p.winner, madeFor: p.madeFor, builtWith: p.builtWith, path: p.cohortSlug ? projectPath(p) : null }));
      })
  );

  server.registerTool(
    "get_project",
    { title: "Get project", description: "Every field of one project.", inputSchema: z.object({ slug: z.string() }) },
    ({ slug }) =>
      tool(async () => {
        const p = await projects.getProject(slug);
        if (!p || !can.seeProject(actor(), { programme: p.badge, lodgeId: p.lodgeId })) throw new CmsError("Project not found");
        return p;
      })
  );

  server.registerTool(
    "create_project",
    {
      title: "Create project",
      description:
        "Creates a project as a draft (status 'draft' unless 'in_review' is given). The slug comes from the title. Publish with set_project_status after a human has checked it. Lodge heads must pass the lodgeId of one of their lodges (from list_cohorts).",
      inputSchema: z.object({ ...projectFields, title: z.string(), status: z.enum(["draft", "in_review"]).optional() }),
    },
    (input) => tool(() => projects.createProject(actor(), input))
  );

  server.registerTool(
    "update_project",
    {
      title: "Update project",
      description: "Updates only the fields you pass. Changing the title doesn't change the slug.",
      inputSchema: z.object({ slug: z.string(), ...projectFields }),
    },
    ({ slug, ...input }) => tool(() => projects.updateProject(actor(), slug, input))
  );

  server.registerTool(
    "set_project_status",
    {
      title: "Set project status",
      description:
        "draft, in_review or published. Published projects appear on smubia.com immediately, at /projects/ailodge/<semester>/<slug> or /projects/dap/<cohort>/<slug>, so a project needs a cohortId before it can be published. Lodge heads can only submit their drafts (in_review); after that the project is locked for them until AI Lodge exco returns it to draft.",
      inputSchema: z.object({ slug: z.string(), status: z.enum(PROJECT_STATUSES) }),
    },
    ({ slug, status }) => tool(async () => (await projects.setProjectStatus(actor(), slug, status), { slug, status }))
  );

  server.registerTool(
    "set_track_winner",
    {
      title: "Set Hack Day track winner",
      description: "Marks (or unmarks) an AI Lodge project as its track's winner. Each track has one winner; marking a new one replaces the old.",
      inputSchema: z.object({ slug: z.string(), winner: z.boolean() }),
    },
    ({ slug, winner }) => tool(async () => (await projects.setProjectWinner(actor(), slug, winner), { slug, winner }))
  );

  server.registerTool(
    "upload_image",
    {
      title: "Upload image",
      description: "Re-hosts an image on Vercel Blob and returns its URL. Pass either a public URL or base64 data (with a filename).",
      inputSchema: z.object({
        url: z.string().optional(),
        base64: z.string().optional(),
        filename: z.string().default("image.png"),
        folder: z.enum(["projects", "newsletter", "team", "lodges"]).default("projects").describe("lodges also accepts SVG (logos, animated art)"),
      }),
    },
    ({ url, base64, filename, folder }) =>
      tool(async () => {
        if (url) return { url: await uploadImageFromUrl(url, folder) };
        if (base64) return { url: await uploadImageFromBase64(base64, filename, folder) };
        throw new CmsError("Pass url or base64");
      })
  );
}
