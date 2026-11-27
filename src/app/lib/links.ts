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
  { key: "dapApplication", label: "DAP Application Form", hint: "“Join DAP” target while applications are open. Empty uses the DAP Telegram.", group: "Recruitment", optional: true },
  { key: "dapTelegram", label: "DAP Telegram", hint: "“Join DAP” target when no form is set or applications are closed.", group: "Recruitment" },
  { key: "aiLodgeSignup", label: "AI Lodge Sign-Up Form", hint: "“Join AI Lodge” target while applications are open.", group: "Recruitment" },
  { key: "telegram", label: "Club Telegram", hint: "Navbar “Join us”, and “Join AI Lodge” target when applications are closed.", group: "Club" },
  { key: "aiLodgeInfosite", label: "AI Lodge Site", hint: "AI Lodge item in the navbar and footer.", group: "Club" },
  { key: "dapNewsletter", label: "DAP Newsletter Channel", hint: "“Subscribe on Telegram” on This Week in DAP. Empty hides the button.", group: "Club", optional: true },
  { key: "email", label: "Club Email", hint: "Footer and Contact page.", group: "Contact", type: "email" },
  { key: "partnershipEmail", label: "Partnerships Email", hint: "“Get in touch” on Work with us and Contact, with the subject “Partnership enquiry”.", group: "Contact", type: "email" },
  { key: "prospectus", label: "Partnership Prospectus", hint: "PDF URL for “Download our prospectus” on Work with us. Empty hides the button.", group: "Contact", optional: true },
  { key: "instagram", label: "Instagram", hint: "Footer.", group: "Socials" },
  { key: "linkedin", label: "LinkedIn", hint: "Footer.", group: "Socials" },
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
