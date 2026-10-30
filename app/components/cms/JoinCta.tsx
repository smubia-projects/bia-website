import { MotionNextLink } from "@/app/components/ui/MotionElements";
import { getSiteLinks } from "@/app/lib/cms/links";
import type { Programme } from "@/app/lib/cms/taxonomy";
import styles from "./JoinCta.module.css";

const GLOW = {
  DAP: "0 0 0 3px rgba(125, 215, 194, 0.16), 0 8px 36px -2px rgba(125, 215, 194, 0.6)",
  "AI Lodge": "0 0 0 3px rgba(255, 211, 146, 0.18), 0 8px 36px -2px rgba(255, 211, 146, 0.6)",
};

/**
 * "Want your project showcased?" band. The join buttons always use the links set
 * in the CMS (Settings › Site links), so every page points at the same form.
 */
export default async function JoinCta({
  programmes,
  heading = "Want your project showcased here?",
  text,
}: {
  programmes: Programme[];
  heading?: string;
  text: string;
}) {
  const links = await getSiteLinks();
  const buttons = programmes.map((p) =>
    p === "DAP"
      ? { key: p, href: links.dapTelegram, label: "Join DAP", className: styles.ctaBtnDap }
      : { key: p, href: links.aiLodgeSignup, label: "Join AI Lodge", className: styles.ctaBtnLodge }
  );

  return (
    <section className={styles.ctaBand}>
      <div className={styles.ctaBandInner}>
        <h2 className={styles.ctaBandHeading}>{heading}</h2>
        <p className={styles.ctaBandText}>{text}</p>
        <div className={styles.ctaBandActions}>
          {buttons.map((b) => (
            <MotionNextLink
              key={b.key}
              href={b.href}
              target="_blank"
              rel="noopener noreferrer"
              className={b.className}
              gleam
              hover={{ y: -3, boxShadow: GLOW[b.key] }}
            >
              {b.label}
            </MotionNextLink>
          ))}
        </div>
      </div>
    </section>
  );
}
