/** The canonical (lower-case, kebab-case) form of a public path. Used by middleware.ts. */
const RENAMED_TOP: Record<string, string> = {
  workwithus: "work-with-us",
  contactus: "contact-us",
};

export function canonicalPath(pathname: string, badge: string | null) {
  const segments = pathname.toLowerCase().split("/");
  if (segments[1] && RENAMED_TOP[segments[1]]) segments[1] = RENAMED_TOP[segments[1]];
  let target = segments.join("/").replace(/\/+$/, "") || "/";
  target = target
    .replace(/^\/projects\/ai-lodge(?=\/|$)/, "/projects/ailodge")
    .replace(/^\/projects\/dap(?=\/|$)/, "/dap/projects");
  if (target === "/projects" && badge !== null) {
    const b = badge.toLowerCase();
    if (b === "ai lodge" || b === "ai-lodge") target = "/projects/ailodge";
    else if (b === "dap") target = "/dap/projects";
  }
  return target;
}
