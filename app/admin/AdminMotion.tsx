"use client";

import type { HTMLMotionProps, TargetAndTransition } from "framer-motion";
import { motion } from "framer-motion";
import { motionTransition } from "@/app/components/ui/motion";

type ButtonEffect =
  | "primary"
  | "neutral"
  | "edit"
  | "delete"
  | "upload"
  | "remove"
  | "add"
  | "plain";

const buttonHover: Record<ButtonEffect, TargetAndTransition> = {
  primary: {
    y: -2,
    backgroundColor: "var(--emerald-strong)",
    boxShadow: "var(--shadow-md)",
  },
  neutral: {
    backgroundColor: "var(--surface-muted)",
    borderColor: "var(--emerald)",
    color: "var(--ink)",
  },
  edit: { backgroundColor: "rgba(125, 215, 194, 0.12)" },
  delete: { backgroundColor: "rgba(220, 38, 38, 0.06)" },
  upload: {
    backgroundColor: "rgba(125, 215, 194, 0.12)",
    borderColor: "var(--emerald)",
  },
  remove: { backgroundColor: "#b91c1c", scale: 1.05 },
  add: { backgroundColor: "rgba(125, 215, 194, 0.12)" },
  plain: { scale: 1.03 },
};

export function AdminButton({
  effect = "neutral",
  children,
  ...props
}: HTMLMotionProps<"button"> & { effect?: ButtonEffect }) {
  return (
    <motion.button
      {...props}
      whileHover={buttonHover[effect]}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={motionTransition.quick}
    >
      {children}
    </motion.button>
  );
}

const fieldFocus = {
  borderColor: "var(--emerald)",
  boxShadow: "0 0 0 3px rgba(125, 215, 194, 0.12)",
};

export function AdminInput(props: HTMLMotionProps<"input">) {
  return (
    <motion.input
      {...props}
      whileFocus={fieldFocus}
      transition={motionTransition.quick}
    />
  );
}

export function AdminSelect(props: HTMLMotionProps<"select">) {
  return (
    <motion.select
      {...props}
      whileFocus={fieldFocus}
      transition={motionTransition.quick}
    />
  );
}

export function AdminTextarea(props: HTMLMotionProps<"textarea">) {
  return (
    <motion.textarea
      {...props}
      whileFocus={fieldFocus}
      transition={motionTransition.quick}
    />
  );
}

export function AdminToggle({
  on,
  className,
  knobClassName,
  ...props
}: HTMLMotionProps<"button"> & {
  on: boolean;
  knobClassName: string;
}) {
  return (
    <motion.button
      {...props}
      className={className}
      animate={{
        backgroundColor: on ? "var(--emerald)" : "var(--surface-muted)",
        borderColor: on ? "var(--emerald)" : "var(--border)",
      }}
      whileTap={{ scale: 0.94 }}
      transition={motionTransition.quick}
    >
      <motion.span
        className={knobClassName}
        animate={{ x: on ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
      />
    </motion.button>
  );
}

