"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import styles from "./PathwaysScroll.module.css";
import { LINKS } from "@/app/lib/links";
import { MOTION_EASE, motionTransition } from "./ui/motion";

const MotionLink = motion.create(Link);

/**
 * The three entry points into the club, in the order a member usually meets
 * them. Rendered as a scroll-linked accordion: a sticky rail on the left whose
 * active tab expands, paired with a tall stack of images on the right.
 */
const PATHWAYS = [
  {
    title: "Data Associate Programme",
    body: "An intensive cohort for students who want to build a stronger foundation in AI and machine learning through guided learning and project work.",
    href: "/DAP",
    image: "/images/dap/dap-presentation-1.webp",
    alt: "A Data Associate Programme member presenting their project",
    accent: "dap",
  },
  {
    title: "AI Lodge",
    body: "Explore applied AI in a small group through hands-on learning and a personal project.",
    href: LINKS.aiLodgeInfosite,
    image: "/images/ailodge/hero-1.webp",
    alt: "AI Lodge builders working together",
    accent: "lodge",
  },
  {
    title: "Curriculum",
    body: "Explore SQL, Python, data analysis, and visualisation through our structured hands-on workshops.",
    href: "/Curriculum",
    image: "/images/excelWorkshop.jpg",
    alt: "Members at a hands-on data workshop",
    accent: "curriculum",
  },
] as const;

type Pathway = (typeof PATHWAYS)[number];

function PathwayPanel({
  pathway,
  index,
  register,
  onActive,
}: {
  pathway: Pathway;
  index: number;
  register: (index: number, element: HTMLElement | null) => void;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });

  useEffect(() => {
    register(index, ref.current);
    return () => register(index, null);
  }, [index, register]);

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  return (
    <motion.figure
      ref={ref}
      data-index={index}
      className={`${styles.panel} ${styles[pathway.accent]}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.55, ease: MOTION_EASE }}
    >
      <div className={styles.panelHeading}>
        <span className={styles.panelTitle}>{pathway.title}</span>
      </div>
      <motion.div
        className={styles.panelMedia}
        whileHover={{ y: -3, boxShadow: "var(--shadow-xl)" }}
        transition={motionTransition.standard}
      >
        <Image
          src={pathway.image}
          alt={pathway.alt}
          fill
          sizes="(min-width: 900px) 46vw, 100vw"
          className={styles.panelImg}
        />
      </motion.div>
      <figcaption className={styles.panelText}>
        <p className={styles.tabBody}>{pathway.body}</p>
        <MotionLink
          href={pathway.href}
          className={styles.tabLink}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
          transition={motionTransition.quick}
        >
          Explore →
        </MotionLink>
      </figcaption>
    </motion.figure>
  );
}

export default function PathwaysScroll() {
  const [active, setActive] = useState(0);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  const reduceMotion = useReducedMotion();

  const registerPanel = useCallback(
    (index: number, element: HTMLElement | null) => {
      panelRefs.current[index] = element;
    },
    []
  );

  const selectPanel = useCallback((index: number) => setActive(index), []);

  const goTo = (i: number) => {
    const panel = panelRefs.current[i];
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const target =
      window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;

    if (reduceMotion) {
      window.scrollTo(0, target);
      return;
    }

    animate(window.scrollY, target, {
      duration: 0.65,
      ease: MOTION_EASE,
      onUpdate: (latest) => window.scrollTo(0, latest),
    });
  };

  return (
    <div className={styles.wrap}>
      <h2 className={styles.visuallyHidden}>What we do</h2>
      {/* Sticky rail — accordion of the three pathways. */}
      <div className={styles.rail}>
        <ol className={styles.tabs}>
          {PATHWAYS.map((p, i) => (
            <motion.li
              key={p.title}
              className={`${styles.tab} ${styles[p.accent]}`}
              layout
              transition={motionTransition.standard}
            >
              <motion.span
                className={styles.tabIndicator}
                initial={false}
                animate={{ scaleY: i === active ? 1 : 0, opacity: i === active ? 1 : 0 }}
                transition={motionTransition.standard}
                aria-hidden="true"
              />
              <motion.button
                type="button"
                className={styles.tabHead}
                onClick={() => goTo(i)}
                aria-current={i === active}
                whileTap={{ scale: 0.99 }}
              >
                <motion.span
                  className={styles.tabTitle}
                  animate={{
                    x: i === active ? 3 : 0,
                    color: i === active ? "var(--ink)" : "var(--ink-faint)",
                  }}
                  whileHover={{ color: "var(--ink-soft)", x: i === active ? 3 : 2 }}
                  transition={motionTransition.quick}
                >
                  {p.title}
                </motion.span>
              </motion.button>
              <AnimatePresence initial={false}>
                {i === active && (
                  <motion.div
                    className={styles.tabReveal}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: MOTION_EASE }}
                  >
                    <motion.div
                      className={styles.tabRevealInner}
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: { staggerChildren: 0.06, delayChildren: 0.04 },
                        },
                      }}
                    >
                      <motion.p
                        className={styles.tabBody}
                        variants={{
                          hidden: { opacity: 0, y: -6 },
                          visible: { opacity: 1, y: 0 },
                        }}
                      >
                        {p.body}
                      </motion.p>
                      <MotionLink
                        href={p.href}
                        className={styles.tabLink}
                        variants={{
                          hidden: { opacity: 0, y: -5 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.98 }}
                        transition={motionTransition.quick}
                      >
                        Explore →
                      </MotionLink>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ol>
      </div>

      {/* Media stack — one tall image panel per pathway */}
      <div className={styles.stack}>
        {PATHWAYS.map((p, i) => (
          <PathwayPanel
            key={p.title}
            pathway={p}
            index={i}
            register={registerPanel}
            onActive={selectPanel}
          />
        ))}
      </div>
    </div>
  );
}
