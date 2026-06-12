/**
 * Work with Us page content — sourced from the SMUBIA Partnership Prospectus.
 * Edit this file to update tiers, benefits, events or partners; page.tsx
 * renders whatever is here.
 */

export interface Tier {
  id: string;
  name: string;
  range: string;
}

export const TIERS: Tier[] = [
  { id: "bronze", name: "Bronze", range: "$300–599" },
  { id: "silver", name: "Silver", range: "$600–899" },
  { id: "gold", name: "Gold", range: "$900–1,199" },
  { id: "platinum", name: "Platinum", range: "$1,200+" },
];

export interface Benefit {
  label: string;
  /** Index into TIERS — the lowest tier that receives this benefit (cumulative). */
  minTier: number;
}

// TODO: confirm exact tier↔benefit mapping with the PR team
// (prospectus p.11 matrix). Cumulative model assumed.
export const BENEFITS: Benefit[] = [
  { label: "Company logo on promotional EDM footer", minTier: 0 },
  { label: "Bundled “Thank You” carousel post on Instagram", minTier: 0 },
  { label: "Flyers / merch in Networking Night goodie bag", minTier: 1 },
  { label: "Company information distributed via Telegram", minTier: 1 },
  { label: "Feature on Instagram Stories", minTier: 2 },
  { label: "Feature on the BIA website", minTier: 2 },
  { label: "Booth at Networking Night (for hiring companies)", minTier: 3 },
  { label: "Personalised “Thank You” post on LinkedIn", minTier: 3 },
];

export interface SponsorableEvent {
  name: string;
  timing: string;
  reach: string;
  items: string;
  highlight?: boolean;
}

export const EVENTS: SponsorableEvent[] = [
  {
    name: "BIA Datathon",
    timing: "January",
    reach: "100+ student sign-ups",
    items: "Cash, food, door gifts",
    highlight: true,
  },
  {
    name: "BIA Networking Night",
    timing: "February",
    reach: "200+ students · 10–15 company booths · panel discussion",
    items: "Cash, food, door gifts",
    highlight: true,
  },
  {
    name: "Welfare Drive",
    timing: "November & April",
    reach: "150 welfare packs for finals season",
    items: "Corporate gifts, vouchers, snacks",
  },
  {
    name: "Data Associate Programme",
    timing: "Year-round",
    reach: "~50 associates per cohort — our flagship AI/ML programme",
    items: "Buffet/refreshments, door gifts",
  },
  {
    name: "Technical Workshops",
    timing: "August–October",
    reach: "~50 students per workshop",
    items: "Buffet/refreshments",
  },
  {
    name: "BIA Tea Session",
    timing: "August",
    reach: "~50 new members",
    items: "Buffet/refreshments",
  },
  {
    name: "BIA Indoor Picnic",
    timing: "August",
    reach: "~50 members",
    items: "Buffet/refreshments",
  },
  {
    name: "Alumni Networking",
    timing: "Date TBC",
    reach: "~50 alumni & members",
    items: "Buffet/refreshments",
  },
];

export interface WhyPartnerCard {
  title: string;
  body: string;
  points: string[];
}

export const WHY_PARTNER: WhyPartnerCard[] = [
  {
    title: "Brand awareness",
    body: "Reach more than 1,500 data enthusiasts across SMU and beyond.",
    points: [
      "2,000+ Telegram subscribers",
      "1,000+ Instagram followers",
      "700+ LinkedIn connections",
    ],
  },
  {
    title: "CSR impact",
    body: "Make a visible difference in student education.",
    points: [
      "Conduct workshops for educational outreach",
      "Provide mentorships to empower students",
      "Initiate sustainable practices in school",
    ],
  },
  {
    title: "Talent recruitment",
    body: "A continuous stream of interns and full-time applicants who have proven themselves.",
    points: [
      "1st place — NUS RightShip Challenge",
      "Winner — TikTok Hackathon",
      "1st place — Dell LifeSavers' Innovation Challenge 2023",
    ],
  },
];

/** Flip to true once partner logos are added below. */
export const SHOW_PARTNERS = false;

export interface Partner {
  name: string;
  logo: string; // path under /public or a Blob URL
}

export const PARTNERS: Partner[] = [];
