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
  "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-radar-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-bg";

const variantStyles = {
  primary:
    "bg-gradient-to-r from-radar-primary to-radar-accent text-radar-white shadow-[0_8px_30px_-8px_var(--color-radar-primary)] hover:brightness-110 hover:shadow-[0_12px_44px_-6px_var(--color-radar-primary)]",
  secondary:
    "border border-white/15 bg-white/5 text-radar-white backdrop-blur-xl hover:border-white/25 hover:bg-white/10 hover:shadow-[0_0_28px_-10px_var(--color-radar-accent)]",
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

  if (href) {
    return (
      <motion.div
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={classes}
      {...ariaProps}
    >
      {children}
    </motion.button>
  );
}
