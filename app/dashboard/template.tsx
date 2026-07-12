"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Subtle per-route fade/slide for everything under `/dashboard` (Dashboard
 * home ↔ Explorer today, any future segment added here later — e.g.
 * Settings/Profile — automatically inherits this without further wiring).
 * `template.tsx` remounts on every navigation, unlike `layout.tsx`, which is
 * what makes the `key={pathname}`-driven transition actually replay per
 * route. Quick View's own slide-in drawer transition is untouched — it's a
 * drawer, not a route, and already has its own established motion.
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
