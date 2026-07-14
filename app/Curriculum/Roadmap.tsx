"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { MOTION_EASE } from "@/app/components/ui/motion";
import styles from "./roadmap.module.css";

const cards = {
  green: {
    src: "/curriculum-roadmap/assests/green.svg",
    title: "Data Support Analyst card",
    rect: { x: 110.857, y: 715.857, width: 198.571, height: 322.857 },
  },
  pink: {
    src: "/curriculum-roadmap/assests/pink.svg",
    title: "Business Analyst card",
    rect: { x: 110.857, y: 1084.43, width: 198.571, height: 322.857 },
  },
  brown: {
    src: "/curriculum-roadmap/assests/brown.svg",
    title: "Product Strategy Analyst card",
    rect: { x: 375.143, y: 715.857, width: 198.571, height: 322.857 },
  },
  orange: {
    src: "/curriculum-roadmap/assests/orange.svg",
    title: "Data Engineer card",
    rect: { x: 375.143, y: 1084.6, width: 198.571, height: 322.857 },
  },
} as const;

type CardName = keyof typeof cards;

const billSources = ["1", "5", "10", "20", "50", "100"];

type Bill = {
  id: number;
  src: string;
  left: number;
  drift: number;
  tilt: number;
  spin: number;
  duration: number;
};

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function activateWithKeyboard(event: React.KeyboardEvent, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export default function Roadmap() {
  const reduceMotion = useReducedMotion();
  const [activeCard, setActiveCard] = useState<CardName | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const rainTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rainEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextBillId = useRef(0);

  const removeBill = useCallback((id: number) => {
    setBills((current) => current.filter((bill) => bill.id !== id));
  }, []);

  const addBill = useCallback(() => {
    const denomination =
      billSources[Math.floor(Math.random() * billSources.length)];

    setBills((current) => [
      ...current,
      {
        id: nextBillId.current++,
        src: `/curriculum-roadmap/assests/${denomination}.svg`,
        left: randomBetween(-8, 98),
        drift: randomBetween(-54, 54),
        tilt: randomBetween(-34, 34),
        spin: randomBetween(-260, 260),
        duration: randomBetween(1.4, 2.8),
      },
    ]);
  }, []);

  const makeItRain = useCallback(() => {
    if (rainTimer.current) return;

    addBill();
    if (reduceMotion) return;

    rainTimer.current = setInterval(addBill, 120);
    rainEndTimer.current = setTimeout(() => {
      if (rainTimer.current) clearInterval(rainTimer.current);
      rainTimer.current = null;
      rainEndTimer.current = null;
    }, 5000);
  }, [addBill, reduceMotion]);

  useEffect(() => {
    return () => {
      if (rainTimer.current) clearInterval(rainTimer.current);
      if (rainEndTimer.current) clearTimeout(rainEndTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!activeCard) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveCard(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeCard]);

  return (
    <main className={styles.stage}>
      <motion.section
        className={styles.frame}
        aria-label="BIA roadmap"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.72, ease: MOTION_EASE }}
      >
        <svg
          className={styles.board}
          viewBox="0 0 690 1421"
          role="img"
          aria-labelledby="roadmap-title roadmap-desc"
        >
          <title id="roadmap-title">Your Journey with BIA</title>
          <desc id="roadmap-desc">
            A Monopoly-themed BIA roadmap with four selectable career path cards.
          </desc>
          <image
            href="/curriculum-roadmap/assests/rawr.svg"
            width="690"
            height="1421"
          />

          <motion.g
            role="button"
            tabIndex={0}
            aria-label="Make it rain Monopoly-style money"
            className={styles.hotspot}
            onClick={makeItRain}
            onKeyDown={(event) => activateWithKeyboard(event, makeItRain)}
            whileHover={{ scale: 1.025 }}
            whileTap={{ scale: 0.985 }}
          >
            <rect x="455" y="82" width="225" height="125" />
          </motion.g>

          {(Object.entries(cards) as [CardName, (typeof cards)[CardName]][]).map(
            ([name, card]) => (
              <motion.g
                key={name}
                role="button"
                tabIndex={0}
                aria-label={`Open ${card.title}`}
                className={styles.hotspot}
                onClick={() => setActiveCard(name)}
                onKeyDown={(event) =>
                  activateWithKeyboard(event, () => setActiveCard(name))
                }
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.985 }}
              >
                <motion.rect
                  {...card.rect}
                  whileHover={{ stroke: "rgba(255, 255, 255, 0.78)" }}
                  transition={{ duration: 0.2 }}
                />
              </motion.g>
            ),
          )}
        </svg>
      </motion.section>

      <div className={styles.moneyRain} aria-hidden="true">
        <AnimatePresence>
          {bills.map((bill) => (
            <motion.img
              key={bill.id}
              className={styles.moneyBill}
              src={bill.src}
              alt=""
              style={{ left: `${bill.left}vw` }}
              initial={{ y: -48, x: 0, rotate: bill.tilt, opacity: 0.96 }}
              animate={
                reduceMotion
                  ? { y: 0, opacity: [0, 0.96, 0] }
                  : {
                      y: "112dvh",
                      x: bill.drift,
                      rotate: bill.spin,
                      opacity: 0.94,
                    }
              }
              exit={{ opacity: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0.35 }
                  : { duration: bill.duration, ease: "linear" }
              }
              onAnimationComplete={() => removeBill(bill.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeCard && (
          <motion.div
            className={styles.modalBackdrop}
            role="dialog"
            aria-modal="true"
            aria-labelledby="roadmap-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={() => setActiveCard(null)}
          >
            <h2 id="roadmap-modal-title" className={styles.srOnly}>
              {cards[activeCard].title}
            </h2>
            <motion.button
              type="button"
              className={styles.modalButton}
              aria-label={`Close ${cards[activeCard].title}`}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.42, ease: MOTION_EASE }}
              whileHover={{ scale: 1.018 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => setActiveCard(null)}
            >
              <motion.img
                className={styles.modalImage}
                src={cards[activeCard].src}
                alt={cards[activeCard].title}
                width="307"
                height="395"
                layoutId={`roadmap-card-${activeCard}`}
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
