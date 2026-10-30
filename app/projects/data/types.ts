export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  /** Optional social links, surfaced as icons beside the member's name */
  linkedin?: string;
  github?: string;
  website?: string;
}

/** A customizable highlight card (icon + heading + markdown body). */
export interface HighlightCard {
  /** Icon key from `cardIcons.ts` */
  icon: string;
  title: string;
  body: string;
}

export interface Project {
  slug: string;
  title: string;
  description: string;
  badge: "DAP" | "AI Lodge";
  category: string;
  coverImage: string;
  images: string[];
  /** Project overview (markdown). Absorbs the former `rationale` field. */
  overview: string;
  /**
   * @deprecated Merged into `overview`. Retained only so legacy Redis records
   * still typecheck and their text can be folded into the overview on read;
   * saving a project clears it. Do not surface in new UI.
   */
  rationale?: string;
  /** Customizable highlight cards shown below the project details. */
  cards?: HighlightCard[];
  /**
   * @deprecated Replaced by the flexible `cards` array. Retained so legacy Redis
   * records still typecheck and can be migrated into `cards` on read; saving a
   * project clears it.
   */
  lessons?: {
    satisfaction: string;
    takeaway: string;
  };
  team: TeamMember[];
  programme: string;
  techStack: string[];
  demoUrl?: string;
  sourceUrl?: string;
  /** Deployed / live demo URL, surfaced as the "Try it live" button on the detail page */
  liveUrl?: string;
  /**
   * @deprecated The long-form story column was removed. Retained only so legacy
   * Redis records still typecheck; not read or written by the current UI.
   */
  article?: string;
  /** When true, the project is excluded from the public /projects listing */
  hidden?: boolean;

  // ── CMS fields (Postgres era). `hidden` is derived: status !== "published".
  // (The Redis-era "Completed" | "Ongoing" status was never shown and is dropped.)
  status?: "draft" | "in_review" | "published";
  cohortId?: string | null;
  /** e.g. "AY26/27 Semester 1" */
  cohortName?: string;
  /** e.g. "ay2627-s1", for yearbook links */
  cohortSlug?: string;
  trackId?: number | null;
  trackName?: string;
  /** Track position in its semester (drives the shelf accent colour) */
  trackPosition?: number;
  /** AI Lodge lodge the team was in; its page lives on ailodge.smubia.com */
  lodgeId?: number | null;
  lodgeName?: string;
  lodgeUrl?: string;
  /** Audience facet ("Made for") */
  madeFor?: string;
  /** Technique facet ("Built with") */
  builtWith?: string;
  /** Hack Day winner of its track */
  winner?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}
