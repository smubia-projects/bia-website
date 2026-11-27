import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Roboto_Mono } from "next/font/google";
import Navbar from "@/components/site/nav";
import FooterBar from "@/components/site/footer";
import LoadingScreen from "@/components/site/loadingscreen";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import MotionProvider from "@/components/ui/MotionProvider";
import SiteChrome from "@/components/site/SiteChrome";
import { SiteLinksProvider } from "@/components/site/SiteLinksProvider";
import { getSiteLinks } from "@/server/site/links";
import { getSitePhotos } from "@/server/site/photos";
import { SitePhotosProvider } from "@/components/site/SitePhotosProvider";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  title: "SMUBIA — SMU Business Intelligence & Analytics Club",
  description:
    "SMU's home for data analytics, AI and machine learning. Workshops, the Data Associate Programme, and the annual BIA Datathon — open to all backgrounds since 2015.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [links, photos] = await Promise.all([getSiteLinks(), getSitePhotos()]);
  return (
    <html lang="en">
      <body className={`${display.variable} ${inter.variable} ${mono.variable}`}>
        <SiteLinksProvider links={links}>
        <SitePhotosProvider photos={photos}>
        <MotionProvider>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <SiteChrome>
            <LoadingScreen />
            <Navbar />
          </SiteChrome>
          {children}
          <Analytics />
          <SpeedInsights />
          <div id="portal"></div>
          <SiteChrome>
            <FooterBar />
          </SiteChrome>
        </MotionProvider>
        </SitePhotosProvider>
        </SiteLinksProvider>
      </body>
    </html>
  );
}
