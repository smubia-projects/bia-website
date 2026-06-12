import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, Roboto_Mono } from "next/font/google";
import Navbar from "./components/nav";
import FooterBar from "./components/footer";
import LoadingScreen from "./components/loadingscreen";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${inter.variable} ${mono.variable}`}>
        <LoadingScreen />
        <Navbar />
        {children}
        <Analytics />
        <SpeedInsights />
        <div id="portal"></div>
        <FooterBar />
      </body>
    </html>
  );
}
