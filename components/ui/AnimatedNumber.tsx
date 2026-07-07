"use client";

import { useLayoutEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toLocaleString(),
  duration = 1,
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  // Seeded with the real target value so the server-rendered text and the
  // first client render always match — the count-up-from-zero only kicks in
  // afterwards, in a layout effect, so nothing user-visible ever regresses
  // to zero before paint.
  const [display, setDisplay] = useState(value);

  useLayoutEffect(() => {
    if (prefersReducedMotion) return;
    // `onUpdate` fires immediately with the starting value (0), so the
    // counter still visibly resets before counting up without a separate
    // synchronous `setDisplay(0)` call here.
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: setDisplay,
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
    <span className={className} suppressHydrationWarning>
      {format(shown)}
    </span>
  );
}
