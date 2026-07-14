"use client";

import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type HTMLMotionProps } from "framer-motion";
import { motionTransition } from "./motion";

type MotionStyle = {
  y?: number;
  x?: number;
  scale?: number;
  opacity?: number;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  boxShadow?: string;
};

type SurfaceProps = {
  as?: "div" | "article" | "li";
  children: ReactNode;
  className?: string;
  hover?: MotionStyle;
  tap?: MotionStyle;
};

export function MotionSurface({
  as = "div",
  children,
  className,
  hover = { y: -2, boxShadow: "var(--shadow-md)" },
  tap,
}: SurfaceProps) {
  const props = {
    className,
    whileHover: hover,
    whileTap: tap,
    transition: motionTransition.quick,
    children,
  };

  if (as === "article") return <motion.article {...props} />;
  if (as === "li") return <motion.li {...props} />;
  return <motion.div {...props} />;
}

type AnchorProps = HTMLMotionProps<"a"> & {
  hover?: MotionStyle;
  tap?: MotionStyle;
  gleam?: boolean;
};

export function MotionAnchor({ hover, tap, children, ...props }: AnchorProps) {
  return (
    <motion.a
      {...props}
      whileHover={hover ?? { x: 3 }}
      whileTap={tap ?? { scale: 0.98 }}
      transition={motionTransition.quick}
    >
      {children}
    </motion.a>
  );
}

const AnimatedLink = motion.create(Link);

export function MotionNextLink({
  hover,
  tap,
  gleam = false,
  children,
  ...props
}: AnchorProps) {
  return (
    <AnimatedLink
      {...props}
      href={props.href ?? "#"}
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileFocus="hover"
      whileTap="tap"
      variants={{
        rest: {},
        hover: hover ?? { x: 3 },
        tap: tap ?? { scale: 0.98 },
      }}
      transition={motionTransition.quick}
    >
      {children as ReactNode}
      {gleam && (
        <motion.span
          aria-hidden="true"
          variants={{ rest: { x: "-130%" }, hover: { x: "130%" } }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.55) 50%, transparent 75%)",
          }}
        />
      )}
    </AnimatedLink>
  );
}

const AnimatedImage = motion.create(Image);

type MotionImageProps = ComponentProps<typeof AnimatedImage> & {
  hover?: MotionStyle;
};

export function MotionImage({ hover, ...props }: MotionImageProps) {
  return (
    <AnimatedImage
      {...props}
      whileHover={hover ?? { opacity: 1 }}
      transition={motionTransition.quick}
    />
  );
}
