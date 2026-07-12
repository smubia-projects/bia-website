import React from "react";
import styles from "./roadmap.module.css";

export const metadata = {
  title: "Events — SMUBIA",
  description:
    "The SMU BIA roadmap — explore the career paths and programmes that make up a year with the Business Intelligence & Analytics Club.",
};

/**
 * Events routes to the standalone BIA roadmap subsite (kept in
 * public/events-roadmap, source in _curriculum). It has its own deliberately
 * different styling, so we embed it in an isolated iframe rather than porting
 * the markup. The site-wide Navbar and Footer still wrap it via the root layout.
 */
const Page: React.FC = () => {
  return (
    <main>
      <iframe
        src="/events-roadmap/index.html"
        title="SMU BIA Roadmap"
        className={styles.frame}
      />
    </main>
  );
};

export default Page;
