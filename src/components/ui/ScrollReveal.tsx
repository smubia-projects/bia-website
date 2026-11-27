"use client";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeRise, motionTransition } from "./motion";

interface ScrollRevealProps {
  children: ReactNode;
  threshold?: number;
  /** Stagger delay in ms applied once the element enters the viewport */
  delay?: number;
  /** Render as a list item so it can sit directly inside <ol>/<ul> */
  as?: "div" | "li";
  className?: string;
}

export default function ScrollReveal({
  children,
  threshold = 0.1,
  delay = 0,
  as = "div",
  className,
}: ScrollRevealProps) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component
      className={className}
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
    </Component>
  );
}
