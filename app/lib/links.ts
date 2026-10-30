/**
 * Club URLs and calls to action used across the site.
 *
 * The keys in EDITABLE_LINKS are edited in the CMS (Settings › Site links) and read
 * with `getSiteLinks()` on the server or `useSiteLinks()` in client components. The
 * values below are only the defaults used until someone saves a link there.
 * General membership CTAs use `telegram`; programme applications keep separate
 * destinations so DAP and AI Lodge can change independently.
 */
export const DEFAULT_LINKS = {
  telegram: "https://t.me/+b76giYm_q5Q1NGI1",
  dapTelegram: "https://t.me/join_smubia_dap",
  aiLodgeSignup: "https://forms.gle/ZU3dx3i3fioxkvjv8",
  aiLodgeInfosite: "https://ailodge.smubia.com",
  instagram: "https://www.instagram.com/smu.bia/",
  linkedin: "https://www.linkedin.com/company/13402601/",
};

export type LinkKey = keyof typeof DEFAULT_LINKS;
export type SiteLinks = Record<LinkKey, string>;

/** Labels and hints for the CMS form, in display order. */
export const EDITABLE_LINKS: { key: LinkKey; label: string; hint: string }[] = [
  { key: "dapTelegram", label: "Join DAP", hint: "Every “Join DAP” button" },
  { key: "aiLodgeSignup", label: "Join AI Lodge", hint: "Every “Join AI Lodge” button (the sign-up form)" },
  { key: "telegram", label: "Join the club", hint: "Navbar “Join us” and the general Telegram links" },
  { key: "aiLodgeInfosite", label: "AI Lodge site", hint: "The AI Lodge item in the navbar and footer" },
  { key: "instagram", label: "Instagram", hint: "Footer" },
  { key: "linkedin", label: "LinkedIn", hint: "Footer" },
];

/** Fixed contact addresses (not edited in the CMS). */
export const CONTACT = {
  email: "mailto:bia@sa.smu.edu.sg",
  partnershipEmail: "mailto:bia@sa.smu.edu.sg?subject=Partnership%20enquiry",
} as const;
