/**
 * Club URLs and calls to action used across the site.
 *
 * Everything here is edited in the CMS (Settings › Site links) and read with
 * `getSiteLinks()` on the server or `useSiteLinks()` in client components. The
 * values below are only the defaults used until someone saves a value there.
 * Never hard-code a join link: use `joinLink()` so the "applications open"
 * switches apply everywhere.
 */
export const DEFAULT_LINKS = {
  dapApplication: "",
  dapTelegram: "https://t.me/join_smubia_dap",
  aiLodgeSignup: "https://forms.gle/ZU3dx3i3fioxkvjv8",
  telegram: "https://t.me/+b76giYm_q5Q1NGI1",
  aiLodgeInfosite: "https://ailodge.smubia.com",
  dapNewsletter: "",
  email: "bia@sa.smu.edu.sg",
  partnershipEmail: "bia@sa.smu.edu.sg",
  prospectus: "",
  instagram: "https://www.instagram.com/smu.bia/",
  linkedin: "https://www.linkedin.com/company/13402601/",
};

export const DEFAULT_APPLICATIONS = { dap: true, aiLodge: true };

export type LinkKey = keyof typeof DEFAULT_LINKS;
export type Applications = typeof DEFAULT_APPLICATIONS;
export type SiteLinks = Record<LinkKey, string> & { applications: Applications };

export const DEFAULT_SITE_LINKS: SiteLinks = { ...DEFAULT_LINKS, applications: DEFAULT_APPLICATIONS };

export type LinkGroup = "Recruitment" | "Club" | "Contact" | "Socials";

/** The CMS form, in display order. Optional links hide their button when empty. */
export const EDITABLE_LINKS: {
  key: LinkKey;
  label: string;
  hint: string;
  group: LinkGroup;
  type?: "email";
  optional?: boolean;
}[] = [
  { key: "dapApplication", label: "DAP application form", hint: "Where “Join DAP” goes while DAP applications are open. Leave empty to use the DAP Telegram instead.", group: "Recruitment", optional: true },
  { key: "dapTelegram", label: "DAP Telegram", hint: "Where “Join DAP” goes when there's no form or applications are closed", group: "Recruitment" },
  { key: "aiLodgeSignup", label: "AI Lodge sign-up form", hint: "Where “Join AI Lodge” goes while AI Lodge applications are open", group: "Recruitment" },
  { key: "telegram", label: "Club Telegram", hint: "Navbar “Join us”, and where “Join AI Lodge” goes when applications are closed", group: "Club" },
  { key: "aiLodgeInfosite", label: "AI Lodge site", hint: "The AI Lodge item in the navbar and footer", group: "Club" },
  { key: "dapNewsletter", label: "DAP newsletter channel", hint: "“Get it on Telegram” on This week in DAP. Leave empty to hide the button.", group: "Club", optional: true },
  { key: "email", label: "Club email", hint: "Footer and Contact page", group: "Contact", type: "email" },
  { key: "partnershipEmail", label: "Partnerships email", hint: "“Get in touch” on Work with us and Contact (sent with a “Partnership enquiry” subject)", group: "Contact", type: "email" },
  { key: "prospectus", label: "Partnership prospectus", hint: "A PDF link for “Download our prospectus” on Work with us. Leave empty to hide the button.", group: "Contact", optional: true },
  { key: "instagram", label: "Instagram", hint: "Footer", group: "Socials" },
  { key: "linkedin", label: "LinkedIn", hint: "Footer", group: "Socials" },
];

export const mailto = (email: string, subject?: string) =>
  `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

export const partnershipMailto = (links: SiteLinks) => mailto(links.partnershipEmail, "Partnership enquiry");

/**
 * Where a programme's join buttons go. Open: the application form. Closed: the
 * programme's Telegram, so people can hear when applications reopen.
 */
export function joinLink(links: SiteLinks, programme: "DAP" | "AI Lodge"): { href: string; open: boolean } {
  if (programme === "DAP") {
    return links.applications.dap
      ? { href: links.dapApplication || links.dapTelegram, open: true }
      : { href: links.dapTelegram, open: false };
  }
  return links.applications.aiLodge ? { href: links.aiLodgeSignup, open: true } : { href: links.telegram, open: false };
}
