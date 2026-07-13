"use client";

import { type ReactNode } from "react";
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
 *
 * PR9.5.3 — this file previously also rendered a second, decorative
 * `BrandSpinner` overlay here (`tier="md"`, fixed ~220ms lifetime), added
 * back when `PR9.3.4`'s streaming refactor meant `loading.tsx` never fired
 * on navigation. `PR9.5.2` restored genuine top-level `await`ing in
 * `app/dashboard/page.tsx`, so `loading.tsx` (via the shared `RouteLoading`,
 * `tier="lg"`) fires correctly again — which made this decorative overlay
 * redundant, and actively wrong: being `position: fixed` with `z-[150]`, it
 * painted on top of the real `RouteLoading` fallback underneath it, so
 * every navigation showed a small logo (this overlay's `tier="md"`) that
 * faded away after ~220ms to reveal the real, larger `RouteLoading` spinner
 * — two loaders in sequence instead of one. Removed entirely; `loading.tsx`
 * is now the one and only loading indicator for Dashboard navigation.
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
