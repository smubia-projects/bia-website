"use client";

import { usePathname } from "next/navigation";

/** Site navbar, footer and splash are hidden inside the CMS, which has its own shell. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
