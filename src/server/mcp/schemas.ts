import "server-only";
import { z } from "zod";
import { BLOCK_TYPES, BUILT_WITH, MADE_FOR, PROGRAMMES } from "@/shared/taxonomy";

const teamMember = z.object({
  name: z.string(),
  role: z.string().default(""),
  avatar: z.string().default(""),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});
const card = z.object({ icon: z.string().default("lightbulb"), title: z.string(), body: z.string() });

export const projectFields = {
  title: z.string().optional(),
  description: z.string().max(400).optional().describe("Card description, ideally 200 characters or fewer"),
  programme: z.enum(PROGRAMMES).optional(),
  cohortId: z.string().nullable().optional().describe("From list_cohorts, e.g. ai-lodge-ay2627-s1"),
  trackId: z.number().int().nullable().optional().describe("Hack Day track id from list_cohorts (AI Lodge)"),
  lodgeId: z.number().int().nullable().optional().describe("Lodge id from list_cohorts (AI Lodge): the lodge the team was in"),
  madeFor: z.enum(MADE_FOR).or(z.literal("")).optional(),
  builtWith: z.enum(BUILT_WITH).or(z.literal("")).optional(),
  coverImage: z.string().optional().describe("URL from upload_image (16:10 works best)"),
  images: z.array(z.string()).optional().describe("Screenshot URLs from upload_image (16:9)"),
  overview: z.string().optional().describe("Markdown write-up shown as 'Project details'"),
  cards: z.array(card).optional(),
  team: z.array(teamMember).optional(),
  techStack: z.array(z.string()).optional(),
  liveUrl: z.string().optional(),
  sourceUrl: z.string().optional().describe("GitHub URL"),
};

const block = z.object({
  id: z.string().default(""),
  type: z.enum(BLOCK_TYPES),
  heading: z.string().default(""),
  body: z.string().default("").describe("Markdown, or the caption for Image blocks"),
  image: z.string().optional(),
});

export const issueFields = {
  week: z.number().int().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  coverImage: z.string().optional(),
  blocks: z.array(block).optional(),
  postToTelegram: z.boolean().optional(),
};
