"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { BrandSpinner } from "@/components/ui/BrandSpinner";
import { SITE } from "@/constants/site";

const SPLASH_SEEN_KEY = "br-splash-seen";
/** Held for a fixed minimum regardless of how fast the app is ready — this is
 * a deliberate brand moment, not a data-loading wait. */
const MIN_VISIBLE_MS = 2000;
/** Smooth fade-out duration. */
const FADE_MS = 400;

/** Positions/timing for the splash's ambient floating particles — mirrors
 * the pattern `HeroBackground` uses for its own particle layer, at a much
 * lower opacity ceiling since this is a brief, focused brand moment rather
 * than a persistent backdrop. */
const PARTICLES = [
  { top: "32%", left: "28%", size: 3, duration: 6, delay: 0 },
  { top: "68%", left: "32%", size: 4, duration: 7.5, delay: 0.8 },
  { top: "40%", left: "72%", size: 3, duration: 6.5, delay: 1.4 },
  { top: "62%", left: "70%", size: 4, duration: 8, delay: 0.4 },
  { top: "24%", left: "50%", size: 2, duration: 7, delay: 1.8 },
  { top: "76%", left: "48%", size: 3, duration: 6.8, delay: 1.1 },
];

/**
 * The one-time first-load brand moment — mounted once in `app/layout.tsx`,
 * inside `ThemeProvider`. Renders the exact same `BrandSpinner` every loading
 * state in the app uses (`tier="lg"`, the largest) rather than a separate
 * video/asset pipeline — one component, one animation language, everywhere,
 * with fully deterministic timing (no autoplay/decode dependency). The logo
 * itself is untouched (`BrandSpinner` → `BaseRadarLogo`); only what surrounds
 * it — the radar rings behind it, the product name/tagline below it, the
 * ambient particles, and the loading bar — is this screen's own design.
 *
 * `visible` starts `true` unconditionally so server-rendered HTML and the
 * first client paint always agree (no hydration mismatch) — the
 * session-already-seen check runs in a layout effect, which fires before the
 * browser paints, so a repeat hard-refresh within the same session hides it
 * with zero visible flash rather than flickering it on and off.
 */
export function SplashScreen() {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  // Caches the sessionStorage read across React 19 Strict Mode's dev-only
  // effect double-invocation (mount → cleanup → mount again). Without this,
  // the first invocation writes the "seen" flag and starts the hold timer;
  // its cleanup then clears that timer (simulating unmount); the second
  // invocation reads the flag it JUST wrote and immediately treats the
  // session as already-seen, hiding the splash almost instantly. Refs
  // survive the double-invoke, so computing this exactly once and branching
  // on the cached value keeps both invocations in agreement.
  const alreadySeenRef = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    // `visible` starts `true` unconditionally (see the class doc comment)
    // so server-rendered HTML always matches the first client render — that
    // means correcting for an already-seen session can only happen here,
    // synchronizing with `sessionStorage` (a real external system, not
    // derivable app state), and must run in `useLayoutEffect` specifically
    // so it lands before the browser paints, leaving zero visible flash.
    if (alreadySeenRef.current === null) {
      alreadySeenRef.current = Boolean(sessionStorage.getItem(SPLASH_SEEN_KEY));
      if (!alreadySeenRef.current) {
        sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
      }
    }

    if (alreadySeenRef.current) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-7 overflow-hidden bg-radar-light-bg dark:bg-radar-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : FADE_MS / 1000, ease: "easeInOut" }}
        >
          {!prefersReducedMotion &&
            PARTICLES.map((particle, index) => (
              <motion.span
                key={index}
                className="absolute rounded-full bg-radar-primary/50 dark:bg-radar-accent/50"
                style={{ top: particle.top, left: particle.left, width: particle.size, height: particle.size }}
                animate={{ y: [0, -12, 0], opacity: [0.1, 0.5, 0.1] }}
                transition={{
                  duration: particle.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: particle.delay,
                }}
              />
            ))}

          <BrandSpinner tier="lg" />

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-lg font-semibold tracking-tight text-radar-light-text dark:text-radar-white">
              {SITE.name}
            </span>
            <span className="text-sm text-radar-light-secondary-text dark:text-radar-secondary-text">
              {SITE.tagline}
            </span>
          </div>

          <div className="absolute bottom-[12%] h-1 w-40 overflow-hidden rounded-full bg-radar-light-border dark:bg-radar-border">
            <div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-radar-primary to-radar-accent motion-reduce:animate-none"
              style={{ animation: prefersReducedMotion ? undefined : "br-loading-bar 1.4s ease-in-out infinite" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
