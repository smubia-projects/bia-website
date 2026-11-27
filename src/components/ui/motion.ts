import type { Transition, Variants } from "framer-motion";

export const MOTION_EASE = [0.65, 0, 0.35, 1] as const;

export const motionTransition = {
  quick: { duration: 0.2, ease: MOTION_EASE },
  standard: { duration: 0.3, ease: MOTION_EASE },
  reveal: { duration: 0.6, ease: MOTION_EASE },
} satisfies Record<string, Transition>;

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

