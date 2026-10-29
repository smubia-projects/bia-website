/**
 * Fixed vocabularies shared by the CMS, the public pages and the MCP tools.
 * Values are stored as-is in Postgres, so renaming one means migrating rows.
 */

export const PROGRAMMES = ["AI Lodge", "DAP"] as const;
export type Programme = (typeof PROGRAMMES)[number];

export const MADE_FOR = [
  "Students",
  "Money",
  "Health & wellbeing",
  "Everyday life",
  "Safety & trust",
  "Fun & creative",
] as const;

export const BUILT_WITH = [
  "Agents",
  "LLM apps",
  "Image generation",
  "Computer vision",
  "Classic ML",
] as const;

export const PROJECT_STATUSES = ["draft", "in_review", "published"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
};

export const ISSUE_STATUSES = ["draft", "scheduled", "published"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};

export const COHORT_VISIBILITY = ["live", "hidden", "archived"] as const;
export type CohortVisibility = (typeof COHORT_VISIBILITY)[number];

export const ROLES = ["exco", "lodge_head", "dap_editor"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = {
  exco: "Exco admin",
  lodge_head: "Lodge head",
  dap_editor: "DAP editor",
};

export const TEACHING_GROUPS = [
  "Group 1",
  "Group 2",
  "Group 3",
  "Group 4",
  "Group 5",
  "Group 6",
  "All teams",
] as const;

export const BLOCK_TYPES = ["Text", "Team updates", "Shout-outs", "Image"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const BLOCK_HINTS: Record<BlockType, string> = {
  Text: "Write a short section",
  "Team updates": "One or two lines per team: what they shipped or where they are stuck",
  "Shout-outs": "Thank-yous and small wins",
  Image: "Image caption",
};
export const BLOCK_DEFAULT_HEADING: Record<BlockType, string> = {
  Text: "What we learned",
  "Team updates": "Team updates",
  "Shout-outs": "Shout-outs",
  Image: "",
};

/** Number of co-learning weeks a new DAP cohort starts with. */
export const DAP_WEEKS = 10;

/** Project slugs that would shadow a static route under /Projects. */
export const RESERVED_PROJECT_SLUGS = ["ai-lodge", "dap", "new"];

/** Shelf accent per track position (from the approved yearbook design). */
export const TRACK_ACCENTS = ["#0e7c5b", "#1e7a70", "#8a6a00", "#0b5d82", "#12352c"];

/** Monogram tile palette [background, foreground] for projects without a cover. */
export const MONO_PALETTE: [string, string][] = [
  ["#16302a", "#7dd7c2"],
  ["#edf5f1", "#0e7c5b"],
  ["#fff3dd", "#8a5a00"],
  ["#e4f5fd", "#0b5d82"],
  ["#0c211c", "#ffd392"],
  ["#dff5f2", "#1e7a70"],
  ["#33261b", "#ffc978"],
  ["#e9f7f1", "#0a5f46"],
];
