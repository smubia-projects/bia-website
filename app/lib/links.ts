/**
 * Single source of truth for all club URLs used across the site.
 *
 * TODO before launch (waiting on the club — see _intake/SPEC.md §4):
 *  - telegram: the real invite link (e.g. https://t.me/smubia)
 *  - joinForm: membership / DAP sign-up Google Form
 * Until then every join CTA routes to /ContactUs#join so no click is a dead end.
 */
export const LINKS = {
  telegram: "/ContactUs#join", // TODO — real Telegram invite link
  joinForm: "/ContactUs#join", // TODO — membership / DAP sign-up Google Form
  // AI Lodge lives on its own site; the navbar link and every "Join AI Lodge"
  // CTA point here while the internal /AILodge page is kept but unlinked.
  aiLodgeInfosite: "https://ailodge.smubia.com",
  instagram: "https://www.instagram.com/smu.bia/",
  linkedin: "https://www.linkedin.com/company/13402601/",
  email: "mailto:bia@sa.smu.edu.sg",
  datathonSite: "https://hackathon-two-rho.vercel.app/",
} as const;
