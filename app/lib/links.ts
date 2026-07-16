/**
 * Single source of truth for club URLs and calls to action used across the site.
 * General membership CTAs use `telegram`; programme applications keep separate
 * destinations so DAP and AI Lodge can change independently.
 */
export const LINKS = {
  telegram: "https://t.me/+b76giYm_q5Q1NGI1",
  dapTelegram: "https://t.me/join_smubia_dap",
  // AI Lodge lives on its own site; the navbar/footer/Pathways links point here
  // while the internal /AILodge page is kept but unlinked.
  aiLodgeInfosite: "https://ailodge.smubia.com",
  // Sign-up survey behind every "Join AI Lodge" CTA (distinct from the infosite).
  aiLodgeSignup:
    "https://smu.opine.asia/survey?id=d9968e73-86c2-42e2-a2b9-fa7ef7289a3c",
  instagram: "https://www.instagram.com/smu.bia/",
  linkedin: "https://www.linkedin.com/company/13402601/",
  email: "mailto:bia@sa.smu.edu.sg",
  partnershipEmail:
    "mailto:bia@sa.smu.edu.sg?subject=Partnership%20enquiry",
  datathonSite: "https://hackathon-two-rho.vercel.app/",
} as const;
