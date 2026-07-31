"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "br-projects-section-collapsed:";

/** Reads synchronously (no flash of the wrong state) — this component is only ever rendered client-side inside a `"use client"` tree that hydrates after the section's real content already painted server-side expanded, so a same-tick correction here is the same pattern `SplashScreen`'s own `alreadySeenRef` uses for its sessionStorage read. */
function readStoredCollapsed(id: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

type CollapsibleSectionProps = {
  /** Stable, unique key for this section's remembered state — e.g. `"base-today"`, `"kpi-pulse"`. */
  id: string;
  title: string;
  /** Optional short line shown next to the title, always visible even when collapsed (e.g. a live count) — so collapsing a section doesn't hide the one fact worth knowing at a glance. */
  summary?: ReactNode;
  headerAccessory?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * PR-071 Round 2 — Task "make the Projects page configurable." One
 * reusable collapse/expand wrapper (no new dependency — reuses the
 * `framer-motion` this page's own `ProjectsFilterBar` already depends on)
 * for the Projects page's heavier sections (Base Today, KPI Pulse, Smart
 * Views, Explore by Category). Defaults to expanded for a first-time
 * visitor (nothing is hidden until the user chooses to hide it); a power
 * user's collapse choice is remembered per-section in `localStorage`, so
 * revisiting the page respects what they last chose without a server
 * round-trip or new backend state.
 */
export function CollapsibleSection({ id, title, summary, headerAccessory, children, className }: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCollapsed(readStoredCollapsed(id));
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [id]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, next ? "1" : "0");
    } catch {
      // Storage unavailable (private browsing, quota) — the toggle still works for this session, it just won't persist.
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-radar-light-muted uppercase outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
        >
          <ChevronDown
            className={cn("size-3.5 shrink-0 transition-transform duration-200", collapsed && "-rotate-90")}
            aria-hidden="true"
          />
          {title}
          {summary && <span className="font-medium text-radar-light-muted/70 normal-case dark:text-radar-muted/60">· {summary}</span>}
        </button>
        {headerAccessory}
      </div>

      {/* Server-rendered content always shows expanded (matches the pre-hydration DOM exactly, so there's nothing to correct visually before hydration); the collapse itself only ever takes effect once this component has mounted and read the real stored preference. */}
      <AnimatePresence initial={false}>
        {(!hydrated || !collapsed) && (
          <motion.div
            initial={hydrated ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
