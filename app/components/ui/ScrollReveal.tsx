"use client";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeRise, motionTransition } from "./motion";

interface ScrollRevealProps {
  children: ReactNode;
  threshold?: number;
  /** Stagger delay in ms applied once the element enters the viewport */
  delay?: number;
}

export default function ScrollReveal({
  children,
  threshold = 0.1,
  delay = 0,
}: ScrollRevealProps) {
  return (
    <motion.div
      variants={fadeRise}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      transition={{
        ...motionTransition.reveal,
        delay: delay / 1000,
      }}
    >
      {children}
    </motion.div>
  );
}
