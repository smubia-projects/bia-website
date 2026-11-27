"use client";

import { usePathname } from "next/navigation";

/** Site navbar, footer and splash are hidden inside the CMS and the Telegram Mini App, which have their own shells. */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/mini-app")) return null;
  return <>{children}</>;
}
