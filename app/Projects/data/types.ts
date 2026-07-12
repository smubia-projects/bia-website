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
  /** @deprecated No longer surfaced in the UI. Retained for back-compat. */
  status?: "Completed" | "Ongoing";
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
  /** When true, the project is excluded from the public /Projects listing */
  hidden?: boolean;
}
