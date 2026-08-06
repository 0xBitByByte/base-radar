"use client";

import { useSyncExternalStore } from "react";
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
        onClick={() => setTheme(isDark ? "light" : "dark")}
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
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
        className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-radar-light-border outline-none transition-colors data-[checked]:bg-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-bg dark:bg-white/10 dark:focus-visible:ring-offset-radar-bg"
      >
        <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-radar-light-card shadow transition-transform data-[checked]:translate-x-6" />
      </Switch.Root>
    </div>
  );
}
