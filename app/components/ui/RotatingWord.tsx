"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./RotatingWord.module.css";
import { MOTION_EASE } from "./motion";

const HOLD_MS = 2500;

interface RotatingWordProps {
  words?: string[];
}

function joinWords(words: string[]) {
  if (words.length < 2) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export default function RotatingWord({
  words = ["data analytics", "machine learning", "AI"],
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, HOLD_MS);

    return () => clearInterval(interval);
  }, [reduceMotion, words.length]);

  // Screen readers get the full phrase once instead of a live region that
  // re-announces a new word every few seconds.
  return (
    <>
      <span className="sr-only">{joinWords(words)}</span>
      <span className={styles.frame} aria-hidden="true">
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
    </>
  );
}
