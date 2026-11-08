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
  in_review: "In Review",
  published: "Published",
};

export const ISSUE_STATUSES = ["draft", "scheduled", "published"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
};

export const LODGE_STATUSES = ["open", "closed"] as const;
export type LodgeStatus = (typeof LODGE_STATUSES)[number];

/** Drifting particle shapes the AI Lodge site can draw behind a lodge. */
export const LODGE_AMBIENTS = ["none", "pointed", "teardrop", "lance", "heart", "round", "maple", "oval", "bat"] as const;
export type LodgeAmbient = (typeof LODGE_AMBIENTS)[number];
export const LODGE_AMBIENT_LABEL: Record<LodgeAmbient, string> = {
  none: "None",
  pointed: "Pointed leaves",
  teardrop: "Teardrop leaves",
  lance: "Lance leaves",
  heart: "Heart leaves",
  round: "Round leaves",
  maple: "Maple leaves",
  oval: "Oval leaves",
  bat: "Bats",
};

/**
 * Neon signs coded on the AI Lodge site. A lodge's sign is its mark on the lodge
 * card and in a "Repeat the mark" belt, and its hero when the hero is "Neon sign".
 */
export const LODGE_NEON_SIGNS = ["none", "bat", "guitar", "ship", "skull"] as const;
export type LodgeNeonSign = (typeof LODGE_NEON_SIGNS)[number];
export const LODGE_NEON_SIGN_LABEL: Record<LodgeNeonSign, string> = {
  none: "None (logo)",
  bat: "Bat",
  guitar: "Guitar",
  ship: "Ship",
  skull: "Sugar skull",
};

/** How the logo is drawn: painted in the glow colour (one-colour art) or as uploaded. */
export const LODGE_LOGO_STYLES = ["tint", "original"] as const;
export type LodgeLogoStyle = (typeof LODGE_LOGO_STYLES)[number];
export const LODGE_LOGO_STYLE_LABEL: Record<LodgeLogoStyle, string> = {
  tint: "Glow colour",
  original: "Original colours",
};

/** Stand-in emblems for a lodge without a logo yet. */
export const LODGE_EMBLEMS = ["campfire", "pine", "compass", "lantern", "axe"] as const;
export type LodgeEmblem = (typeof LODGE_EMBLEMS)[number];

/** What fills the right of a lodge page's header. */
export const LODGE_HERO_KINDS = ["logo", "neon", "showpiece", "custom", "animated"] as const;
export type LodgeHeroKind = (typeof LODGE_HERO_KINDS)[number];
export const LODGE_HERO_KIND_LABEL: Record<LodgeHeroKind, string> = {
  logo: "Logo",
  neon: "Neon sign",
  showpiece: "Coded showpiece",
  custom: "Custom showpiece",
  animated: "Animated SVG",
};

/** Layered, animated hero art coded on the AI Lodge site (one per lodge that commissioned it). */
export const LODGE_SHOWPIECES = ["despacito", "bryan", "pandai", "spice"] as const;
export type LodgeShowpiece = (typeof LODGE_SHOWPIECES)[number];
export const LODGE_SHOWPIECE_LABEL: Record<LodgeShowpiece, string> = {
  despacito: "Retro sunset poster (Despacito)",
  bryan: "Night badge with fireflies (BRYan)",
  pandai: "Panda in falling leaves (PandAI)",
  spice: "Watercolour chilli with embers (S.P.I.C.E.)",
};

/** Particles a custom showpiece can scatter around its image. */
export const LODGE_PARTICLES = ["none", "ember", "firefly", "petal", "leaf"] as const;
export type LodgeParticles = (typeof LODGE_PARTICLES)[number];
export const LODGE_PARTICLES_LABEL: Record<LodgeParticles, string> = {
  none: "None",
  ember: "Rising embers",
  firefly: "Blinking fireflies",
  petal: "Falling petals",
  leaf: "Falling leaves",
};

/** The strip that scrolls under a lodge page's header. */
export const LODGE_BELT_MODES = ["mark", "tile", "banner", "papel-picado", "none"] as const;
export type LodgeBeltMode = (typeof LODGE_BELT_MODES)[number];
export const LODGE_BELT_MODE_LABEL: Record<LodgeBeltMode, string> = {
  mark: "Repeating lodge mark",
  tile: "Repeating image",
  banner: "Scrolling strip image",
  "papel-picado": "Papel picado bunting",
  none: "No strip",
};
export const LODGE_BELT_SPEEDS = ["slow", "normal", "fast"] as const;
export type LodgeBeltSpeed = (typeof LODGE_BELT_SPEEDS)[number];
export const LODGE_BELT_SIZES = ["small", "medium", "large"] as const;
export type LodgeBeltSize = (typeof LODGE_BELT_SIZES)[number];

export const LODGE_LEVELS = ["Open to all", "Beginner", "Beginner–Intermediate", "Intermediate", "Advanced"];

export const COHORT_VISIBILITY = ["live", "hidden", "archived"] as const;
export type CohortVisibility = (typeof COHORT_VISIBILITY)[number];

export const ROLES = ["exco", "dap_exco", "lodge_exco", "lodge_head"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABEL: Record<Role, string> = {
  exco: "Exco admin",
  dap_exco: "DAP exco",
  lodge_exco: "AI Lodge exco",
  lodge_head: "Lodge head",
};
/** Superadmins are the CMS_BOOTSTRAP_ADMINS emails: an exco admin who also manages People. */
export const SUPERADMIN_LABEL = "Superadmin";
/** The one programme a role works in; exco admins have no limit. Lodge heads only reach their own lodges. */
export const ROLE_PROGRAMME: Record<Role, Programme | null> = {
  exco: null,
  dap_exco: "DAP",
  lodge_exco: "AI Lodge",
  lodge_head: "AI Lodge",
};
/** A lodge head's default access runs this many weeks from their semester's first day of week 1. */
export const LODGE_HEAD_ACCESS_WEEKS = 20;

/** The default last day of a lodge head's access: the latest semester start + LODGE_HEAD_ACCESS_WEEKS. */
export function suggestedAccessEnd(semesterStarts: (string | null | undefined)[]): string | null {
  const latest = semesterStarts.filter((d): d is string => Boolean(d)).sort().pop();
  if (!latest) return null;
  const d = new Date(`${latest}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + LODGE_HEAD_ACCESS_WEEKS * 7);
  return d.toISOString().slice(0, 10);
}


export const BLOCK_TYPES = ["Text", "Team updates", "Shout-outs", "Image"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const BLOCK_HINTS: Record<BlockType, string> = {
  Text: "Section text",
  "Team updates": "One or two lines per team: progress and blockers",
  "Shout-outs": "Acknowledgements",
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

/** Project slugs that would shadow a static route under /projects. */
export const RESERVED_PROJECT_SLUGS = ["ailodge", "ai-lodge", "dap", "new"];

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
