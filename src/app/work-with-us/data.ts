/**
 * Work with Us page content.
 *
 * Wave 3 restructure (2026-07): the Bronze→Platinum sponsorship tier matrix was
 * removed in favour of TWO involvement types (partner on events / sponsor a
 * programme). The stat spotlight replaces the old three-reason "why partner"
 * grid. Every headline number below is UNCONFIRMED — see the `// TBC` markers.
 */

/* ============ Stat spotlight ============ */

export interface Stat {
  /** Numeric value fed to the CountUp primitive. */
  value: number;
  /** Rendered after the number, e.g. "+". */
  suffix: string;
  label: string;
}

// TBC — confirm with club: the focal reach number for the spotlight.
export const STAT_FOCAL: Stat = {
  value: 2000, // TBC — confirm with club
  suffix: "+",
  label: "Members and counting",
};

/* ============ Involvement types ============ */

export interface Involvement {
  title: string;
  /** 2–3 short benefit-led lines. */
  body: string;
  /** A few concise benefit bullets. */
  points: string[];
}

export const INVOLVEMENT: Involvement[] = [
  {
    title: "Partner on events",
    body: "Run a workshop or a corporate event with our community — from a hands-on skills session to a hiring showcase in front of SMU's largest analytics crowd.",
    points: [
      "Co-run workshops or talks",
      "Networking Night booths & hiring",
      "Brand reach across our channels",
    ],
  },
  {
    title: "Sponsor or partner on our programmes",
    body: "Back a flagship programme with a real problem statement. Set a challenge for the Data Associate Programme or the AI Lodge Hackathon and see students build against it.",
    points: [
      "Sponsor a problem challenge",
      "Mentor DAP or AI Lodge teams",
      "First look at emerging builders",
    ],
  },
];

/* ============ Past partners (scaffolding — retained, unused) ============ */

/** Flip to true once partner logos are added below. */
export const SHOW_PARTNERS = false;

export interface Partner {
  name: string;
  logo: string; // path under /public or a Blob URL
}

export const PARTNERS: Partner[] = [];
