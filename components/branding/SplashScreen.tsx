"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { BaseRadarLogo } from "@/components/branding/BaseRadarLogo";
import { SITE } from "@/constants/site";

const SPLASH_SEEN_KEY = "br-splash-seen";
/** Smooth fade-out duration once loading genuinely finishes. */
const FADE_MS = 400;
/**
 * Real progress never claims 100% before `window.load` actually fires — it
 * eases toward this ceiling while waiting (the standard "bounded
 * indeterminate progress" technique: honest about not being done, never
 * fabricating a false completion). Once `load` fires, progress jumps to 100
 * for real.
 */
const RAMP_CEILING = 92;
/**
 * Absolute worst-case hold, only reached if `load` genuinely never fires
 * (a stalled/broken resource) — this is the one hard stop that guarantees
 * the splash can never loop or hang forever, not a disguised fixed timer:
 * under normal operation the real `load` event always wins well before this.
 */
const MAX_WAIT_MS = 8000;

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
 * inside `ThemeProvider`.
 *
 * PR-071 Task 9 — the logo itself now progressively fills via a real
 * `clip-path` reveal driven by a genuine `progress` value, replacing the
 * previous fixed-2000ms bar-underneath-a-static-logo design (the gradient
 * bar filled on a timer that had no relationship to whether the app was
 * actually ready, while the logo above it never changed at all). `progress`
 * eases toward `RAMP_CEILING` while genuinely waiting — it never reaches
 * 100 on its own — and only snaps to 100 when the real browser `load` event
 * fires (every critical resource for the initial paint has actually
 * arrived). `MAX_WAIT_MS` is a hard ceiling for the pathological case where
 * `load` never fires at all (a stalled resource); it never fires under
 * normal operation, so this isn't a disguised fixed timer — the real event
 * is what almost always completes the reveal, and there is no
 * repeating/looping animation of any kind once `visible` becomes `false`.
 *
 * PR-071 Round 3 — Task 10/11: `visible` now flips to `false` in the exact
 * same tick `progress` reaches 100 — no artificial hold in between (the
 * previous ~250ms pause read as "the app finished but is still making me
 * wait," which is the one thing a progress indicator must never do). The
 * only thing left on screen after that is `AnimatePresence`'s own exit
 * fade, a transition of an already-complete state, not a second delay.
 *
 * The reveal itself reuses `BrandLoader`'s own proven technique — a
 * grayscale "ghost" pass of the exact same `logo-icon.webp` asset underneath,
 * and the identical asset at full color on top, clipped via `clip-path:
 * inset(0 X% 0 0)` where `X` shrinks from 100 to 0 as `progress` climbs.
 * Every pixel ever on screen belongs to that one real logo file — nothing
 * about the artwork or its gradient is redrawn or approximated.
 */
export function SplashScreen() {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  // Caches the sessionStorage read across React 19 Strict Mode's dev-only
  // effect double-invocation — see the equivalent guard this component has
  // always used for `alreadySeenRef` (unchanged by this PR's progress work).
  const alreadySeenRef = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    const isReload =
      typeof performance !== "undefined" &&
      performance.getEntriesByType("navigation")[0] instanceof PerformanceNavigationTiming &&
      (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type === "reload";

    if (alreadySeenRef.current === null) {
      alreadySeenRef.current = Boolean(sessionStorage.getItem(SPLASH_SEEN_KEY)) && !isReload;
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    }

    if (alreadySeenRef.current) {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (alreadySeenRef.current) return;

    let rafId: number;
    let completed = false;
    const start = performance.now();

    // Every state update below is scheduled via `requestAnimationFrame`
    // (fires on the next frame, never synchronously within this effect's own
    // body) rather than called directly — including the reduced-motion and
    // "already complete" cases, which would otherwise be a same-tick
    // `setState` at the top of the effect.
    function completeNow() {
      if (completed) return;
      completed = true;
      cancelAnimationFrame(rafId);
      // PR-071 Round 3 — Task 10: no hold, no extra delay once the app is
      // genuinely ready. `visible` flips to `false` in the same frame as
      // `progress` hits 100 — `AnimatePresence`'s own exit transition (below)
      // is the only thing left on screen after that, and it's a real fade
      // of an already-finished state, not a second wait bolted onto it.
      rafId = requestAnimationFrame(() => {
        setProgress(100);
        setVisible(false);
      });
    }

    if (prefersReducedMotion) {
      // No sweep to show — jump straight to the finished state and let the one fade-out play.
      rafId = requestAnimationFrame(completeNow);
      return () => cancelAnimationFrame(rafId);
    }

    function tick(now: number) {
      const elapsed = now - start;
      if (elapsed >= MAX_WAIT_MS) {
        completeNow();
        return;
      }
      // Decaying approach toward the ceiling — fast at first, slower as it
      // nears `RAMP_CEILING`, so it reads as real progress rather than a
      // linear bar that could visually "finish" before the page is ready.
      setProgress((prev) => prev + (RAMP_CEILING - prev) * 0.03);
      rafId = requestAnimationFrame(tick);
    }

    if (document.readyState === "complete") {
      rafId = requestAnimationFrame(completeNow);
    } else {
      rafId = requestAnimationFrame(tick);
      window.addEventListener("load", completeNow);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("load", completeNow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs exactly once per real page load, not on every `prefersReducedMotion` re-evaluation.
  }, []);

  const logoSize = "clamp(84px, 6vmin, 128px)";
  const revealInset = `inset(0 ${Math.max(0, 100 - progress)}% 0 0)`;

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
                transition={{ duration: particle.duration, repeat: Infinity, ease: "easeInOut", delay: particle.delay }}
              />
            ))}

          <div role="status" aria-label="Loading" className="relative flex items-center justify-center" style={{ width: `calc(${logoSize} * 1.35)`, height: `calc(${logoSize} * 1.35)` }}>
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full opacity-[0.16] blur-[36px]"
              style={{
                background: "radial-gradient(circle, var(--color-radar-primary), var(--color-radar-accent) 55%, transparent 72%)",
              }}
            />
            {/* Ghost pass — the same asset, desaturated, showing what's still left to fill. */}
            <div
              aria-hidden="true"
              className="absolute [filter:grayscale(1)_contrast(0.55)_brightness(1.6)]"
              style={{ width: logoSize, height: logoSize }}
            >
              <BaseRadarLogo fill />
            </div>
            {/* Full-color reveal — clipped by real `progress`, not a fixed-duration CSS animation. */}
            <div
              aria-hidden="true"
              className="absolute"
              style={{ width: logoSize, height: logoSize, clipPath: revealInset }}
            >
              <BaseRadarLogo fill />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-lg font-semibold tracking-tight text-radar-light-text dark:text-radar-white">{SITE.name}</span>
            <span className="text-sm text-radar-light-secondary-text dark:text-radar-secondary-text">{SITE.tagline}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
