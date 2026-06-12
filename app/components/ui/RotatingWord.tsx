"use client";
import React, { useEffect, useState } from "react";
import styles from "./RotatingWord.module.css";

const HOLD_MS = 2500;
const FADE_MS = 400;

interface RotatingWordProps {
  words?: string[];
}

export default function RotatingWord({
  words = ["data analytics", "AI", "machine learning", "datathons"],
}: RotatingWordProps) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setLeaving(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setLeaving(false);
      }, FADE_MS);
    }, HOLD_MS);

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span
      className={`${styles.word} ${leaving ? styles.leaving : styles.entering}`}
      aria-live="polite"
    >
      {words[index]}
    </span>
  );
}
