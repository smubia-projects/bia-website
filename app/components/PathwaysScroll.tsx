"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./PathwaysScroll.module.css";
import SectionHeading from "./ui/SectionHeading";
import { LINKS } from "@/app/lib/links";

/**
 * The three entry points into the club, in the order a member usually meets
 * them. Rendered as a scroll-linked accordion: a sticky rail on the left whose
 * active tab expands, paired with a tall stack of images on the right.
 */
const PATHWAYS = [
  {
    kicker: "Flagship",
    title: "Data Associate Programme",
    body: "A selective AI/ML cohort — from theory sessions to a demo-day project, with mentors beside you the whole way.",
    href: "/DAP",
    image: "/images/dap/dap-presentation-1.webp",
    alt: "A Data Associate Programme member presenting their project",
    accent: "dap",
  },
  {
    kicker: "New",
    title: "AI Lodge",
    body: "An eight-week build community where teams ship real AI projects and demo them to the whole club.",
    href: LINKS.aiLodgeInfosite,
    image: "/images/ailodge/hero-1.webp",
    alt: "AI Lodge builders working together",
    accent: "lodge",
  },
  {
    kicker: "Open to all",
    title: "Events & Workshops",
    body: "Hands-on sessions in SQL, Python and data science every semester — no prerequisites, every faculty welcome.",
    href: "/Events",
    image: "/images/excelWorkshop.jpg",
    alt: "Members at a hands-on data workshop",
    accent: "events",
  },
] as const;

export default function PathwaysScroll() {
  const [active, setActive] = useState(0);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.index ?? 0
            );
            setActive(idx);
          }
        });
      },
      // Fire when a panel's centre band crosses the middle of the viewport.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    panelRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (i: number) =>
    panelRefs.current[i]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

  return (
    <div className={styles.wrap}>
      {/* Sticky rail — section heading + accordion of the three pathways.
          Pinning the whole rail keeps the heading in view while images scroll. */}
      <div className={styles.rail}>
        <div className={styles.railHeader}>
          <SectionHeading
            eyebrow="What we do"
            title="Three ways in"
            lede="Pick your entry point — from your first workshop to a deployed model."
          />
        </div>
        <ol className={styles.tabs}>
          {PATHWAYS.map((p, i) => (
            <li
              key={p.title}
              className={`${styles.tab} ${styles[p.accent]} ${
                i === active ? styles.tabActive : ""
              }`}
            >
              <button
                type="button"
                className={styles.tabHead}
                onClick={() => goTo(i)}
                aria-current={i === active}
              >
                <span className={styles.tabTitle}>{p.title}</span>
              </button>
              <div className={styles.tabReveal}>
                <div className={styles.tabRevealInner}>
                  <p className={styles.tabBody}>{p.body}</p>
                  <Link href={p.href} className={styles.tabLink}>
                    Explore →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Media stack — one tall image panel per pathway */}
      <div className={styles.stack}>
        {PATHWAYS.map((p, i) => (
          <figure
            key={p.title}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            data-index={i}
            className={`${styles.panel} ${styles[p.accent]}`}
          >
            {/* Text repeats here only on mobile, where the rail is hidden */}
            <figcaption className={styles.panelText}>
              <span className={styles.panelKicker}>{p.kicker}</span>
              <span className={styles.panelTitle}>{p.title}</span>
              <p className={styles.tabBody}>{p.body}</p>
              <Link href={p.href} className={styles.tabLink}>
                Explore →
              </Link>
            </figcaption>
            <div className={styles.panelMedia}>
              <Image
                src={p.image}
                alt={p.alt}
                fill
                sizes="(min-width: 900px) 46vw, 100vw"
                className={styles.panelImg}
              />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
