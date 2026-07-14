"use client";

import { MotionConfig } from "framer-motion";
import { MOTION_EASE } from "./motion";
import MotionScroll from "./MotionScroll";

export default function MotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.3, ease: MOTION_EASE }}
    >
      <MotionScroll />
      {children}
    </MotionConfig>
  );
}
