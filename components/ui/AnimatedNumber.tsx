"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

import { KpiValueDisplay } from "@/components/ui/KpiValueDisplay";
import type { KpiValueParts } from "@/lib/data/format";

type AnimatedNumberProps = {
  value: number;
  format: (value: number) => KpiValueParts;
  duration?: number;
  className?: string;
};

export function AnimatedNumber({ value, format, duration = 1, className }: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  // Seeded with the real target value so the server-rendered text and the
  // first client render always match — the count-up-from-zero only kicks in
  // afterwards, in a layout effect, so nothing user-visible ever regresses
  // to zero before paint.
  const [display, setDisplay] = useState(value);
  // Mirrors `display` without triggering a re-render on every animation
  // frame — read inside the effect below to find the animation's true
  // starting point (see comment there), and updated in the same
  // `onUpdate` callback that drives `display` itself.
  const displayRef = useRef(value);
  const isFirstRun = useRef(true);

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    // First mount counts up from zero (a real "0 → real value" reveal);
    // every later change (e.g. a periodic live-preview update) animates
    // from whatever's currently on screen — starting that from 0 too would
    // make the number visibly reset and recount on every update, reading
    // as a jarring blink rather than a subtle live tick.
    const from = isFirstRun.current ? 0 : displayRef.current;
    isFirstRun.current = false;
    const controls = animate(from, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => {
        displayRef.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [value, duration, prefersReducedMotion]);

  // With reduced motion, skip the counter animation entirely and always
  // render the real value straight from props.
  const shown = prefersReducedMotion ? value : display;

  return (
    // Node's ICU and the browser's can disagree on compact-notation
    // formatting (e.g. "$486M" vs "$486.00M") for the exact same input —
    // a harmless hydration-text mismatch since `shown` is always
    // recomputed from React state immediately after mount.
    <KpiValueDisplay parts={format(shown)} className={className} suppressHydrationWarning />
  );
}
