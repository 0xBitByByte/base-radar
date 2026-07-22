"use client";

import { motion, useReducedMotion } from "framer-motion";

const logoIcon = "/brand/logo-icon.webp";

/**
 * PR9.2 — replaces the previous dark, video/particle/blob-heavy background
 * with something calmer: Base.org-style restraint over decoration. Every
 * layer here is intentionally faint (opacity ≤ 7%) and slow, so none of it
 * competes with the Hero's own content — "atmosphere, not focus," taken
 * further than the prior version. Theme-aware (the landing page keeps its
 * own Light/Dark toggle, synced with the Dashboard's shared theme provider —
 * not a light-only page), so every layer carries a `dark:` pair.
 */
export function HeroBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-radar-light-bg dark:bg-radar-bg">
      {/* Soft blue glow — a single slow-breathing radial gradient, the only
          "color" in this background besides the grid/logo. transform/opacity
          only, so it stays compositor-only (GPU) work even at a 24s cycle. */}
      <motion.div
        className="absolute top-0 left-1/2 size-[56rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-[0.06] dark:opacity-[0.1]"
        style={{
          background: "radial-gradient(circle, var(--color-radar-primary) 0%, transparent 70%)",
        }}
        animate={prefersReducedMotion ? undefined : { opacity: [0.045, 0.06, 0.045] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Faint grid — the same `currentColor`-driven pattern the Dashboard's
          own ambient backdrop uses. */}
      <div
        className="absolute inset-0 text-radar-light-text opacity-[0.035] dark:text-radar-white dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 35%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 35%, transparent 100%)",
        }}
      />

      {/* The brand mark itself — extremely faint, rotating slowly, logo only
          (no wordmark). Reads as ambient identity, never a focal element;
          held static (not unmounted) under reduced motion. */}
      <motion.img
        aria-hidden="true"
        alt=""
        src={logoIcon}
        className="absolute top-1/2 left-1/2 max-w-none opacity-[0.035] select-none dark:opacity-[0.05]"
        style={{ width: "min(64vmin, 620px)", height: "auto", x: "-50%", y: "-50%" }}
        animate={prefersReducedMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 220, repeat: Infinity, ease: "linear" }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-radar-light-bg dark:to-radar-bg" />
    </div>
  );
}
