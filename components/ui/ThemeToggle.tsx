"use client";

import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Switch } from "@base-ui/react/switch";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

import { FADE_TRANSITION } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

// Reads `true` only once hydration has completed, matching the server's
// render on the first pass so we avoid next-themes hydration mismatches.
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/**
 * Theme-toggle smoothness fix — the prior approach (`app/globals.css`'s
 * broad per-element `transition-property: background-color, color, ...`
 * rule) transitions each element's colors independently via raw RGB
 * interpolation. Confirmed live (screen recording, frame-by-frame) that
 * this produces a visibly muddy, desaturated gray wash partway through —
 * most noticeable where adjacent cards' borders and fills interpolate
 * through similar intermediate grays at the same time, making their
 * boundaries briefly disappear into one flat blob. This is why that rule's
 * own doc comment already describes the result as "still-abrupt-feeling"
 * even after two prior tuning passes (200ms → 240ms, adding
 * `background-image`) — duration/easing tweaks can't fix an artifact
 * that's inherent to animating raw color values across hundreds of
 * elements at once, only how long you're exposed to it.
 *
 * `document.startViewTransition()` (Chrome/Edge 111+, Safari 18+) sidesteps
 * this entirely: the browser crossfades two full-page pixel snapshots
 * (old vs. new) via compositing, not per-element property interpolation —
 * no muddy intermediate color, because no color is ever actually
 * interpolated. `app/globals.css`'s existing rule stays exactly as the
 * fallback for browsers without support (gated there via `@supports not
 * (view-transition-name: none)`, not removed), so this is additive, not a
 * replacement that could regress older browsers.
 *
 * `flushSync` is required here, confirmed live (not assumed): `next-themes`'
 * `setTheme` only queues a React state update — the actual
 * `document.documentElement.classList` mutation happens in its own
 * `useEffect`, which runs *after* this callback would otherwise already
 * have returned. Without `flushSync`, `startViewTransition` captures its
 * "after" snapshot before the DOM has actually changed, which reproduced a
 * real `InvalidStateError: Transition was aborted because of invalid
 * state` on every single toggle (verified in a clean browser tab with no
 * other interaction). `flushSync` forces the state update and its effect
 * to commit synchronously before this callback returns, so the snapshot
 * the browser captures is always the real, already-applied new theme.
 */
function setThemeSmoothly(setTheme: (theme: string) => void, next: "light" | "dark") {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || typeof document.startViewTransition !== "function") {
    setTheme(next);
    return;
  }
  document.startViewTransition(() => flushSync(() => setTheme(next)));
}

type ThemeToggleProps = {
  variant?: "switch" | "icon";
  className?: string;
};

export function ThemeToggle({ variant = "switch", className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // Assume dark until mounted so the server and first client render match.
  const isDark = mounted ? resolvedTheme === "dark" : true;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => setThemeSmoothly(setTheme, isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className={cn(
          "flex size-9 items-center justify-center overflow-hidden rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:text-radar-muted dark:hover:bg-white/5 dark:hover:text-radar-white dark:focus-visible:ring-offset-radar-bg",
          className
        )}
      >
        {/* PR-079 Section 13 — a small icon-swap fade/rotate replacing the previous instant icon change, the one "cleaner, more premium" touch this toggle needed; still the same single icon-variant button, no new component. */}
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
            transition={FADE_TRANSITION}
            className="flex"
          >
            {isDark ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
          </motion.span>
        </AnimatePresence>
      </button>
    );
  }

  return (
    <div className={cn("flex items-center justify-between gap-3 px-3", className)}>
      <span className="flex items-center gap-2 text-sm font-medium text-radar-light-muted dark:text-radar-muted">
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        Theme
      </span>
      <Switch.Root
        checked={isDark}
        onCheckedChange={(checked) => setThemeSmoothly(setTheme, checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
        className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:focus-visible:ring-offset-radar-bg"
      >
        <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6" />
      </Switch.Root>
    </div>
  );
}
