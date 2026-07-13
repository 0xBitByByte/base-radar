"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type GradientButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  className?: string;
  target?: ComponentProps<"a">["target"];
  rel?: ComponentProps<"a">["rel"];
  "aria-label"?: string;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:focus-visible:ring-radar-accent/50 dark:focus-visible:ring-offset-radar-bg";

const variantStyles = {
  primary:
    "bg-gradient-to-r from-[#1565ff] to-[#22c8ff] text-white shadow-[0_8px_30px_-8px_rgba(34,208,238,0.18)] hover:brightness-110 hover:shadow-[0_10px_36px_-6px_rgba(34,208,238,0.28)]",
  secondary:
    "border border-radar-light-border bg-radar-light-surface/70 text-radar-light-text backdrop-blur-xl hover:border-radar-primary/25 hover:bg-radar-light-hover dark:border-white/15 dark:bg-white/5 dark:text-radar-white dark:hover:border-white/25 dark:hover:bg-white/10 dark:hover:shadow-[0_0_28px_-10px_var(--color-radar-accent)]",
} as const;

export function GradientButton({
  children,
  href,
  variant = "primary",
  className,
  target,
  rel,
  ...ariaProps
}: GradientButtonProps) {
  const classes = cn(baseStyles, variantStyles[variant], className);

  // A tween (never a spring) — at any stiffness/damping pairing a spring
  // still overshoots its target by definition, which read as "bouncy" for
  // a button this small. `easeOut` reaches the target and stops, matching
  // the calm, no-bounce feel PR9.3 asks for across every micro-interaction.
  const hoverTransition = { duration: 0.18, ease: "easeOut" as const };

  if (href) {
    return (
      <motion.div
        whileHover={{ y: -1, scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
        transition={hoverTransition}
        className="inline-block"
      >
        <Link href={href} target={target} rel={rel} className={classes} {...ariaProps}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ y: -1, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={hoverTransition}
      className={classes}
      {...ariaProps}
    >
      {children}
    </motion.button>
  );
}
