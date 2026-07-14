"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./RotatingWord.module.css";
import { MOTION_EASE } from "./motion";

const HOLD_MS = 2500;

interface RotatingWordProps {
  words?: string[];
}

export default function RotatingWord({
  words = ["data analytics", "machine learning", "AI"],
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, HOLD_MS);

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className={styles.frame} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className={styles.word}
          initial={{ opacity: 0, y: "0.3em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-0.25em" }}
          transition={{ duration: 0.4, ease: MOTION_EASE }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
