import type { Metadata } from "next";
import MiniApp from "./MiniApp";

export const metadata: Metadata = {
  title: "Tracker | SMUBIA",
  robots: { index: false, follow: false },
};

/** The DAP project tracker as a Telegram Mini App. Opened from the bot's /start; it does nothing outside Telegram. */
export default function MiniAppPage() {
  return <MiniApp />;
}
