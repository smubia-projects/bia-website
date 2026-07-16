"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MOTION_EASE } from "./motion";

const ROTATE_MS = 10000;

interface RotatingHeadlineProps {
  headlines: string[];
  className?: string;
}

export default function RotatingHeadline({
  headlines,
  className,
}: RotatingHeadlineProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (headlines.length < 2) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % headlines.length);
    }, ROTATE_MS);

    return () => clearInterval(interval);
  }, [headlines.length]);

  return (
    // inline-grid stacks every headline in the same cell so the box keeps the
    // height of the tallest line and nothing shifts as they swap
    <h1 className={className} style={{ display: "grid" }} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          style={{ gridArea: "1 / 1" }}
          initial={{ opacity: 0, y: "0.3em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-0.25em" }}
          transition={{ duration: 0.4, ease: MOTION_EASE }}
        >
          {headlines[index]}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}
