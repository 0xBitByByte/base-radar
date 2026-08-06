"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { EXPAND_TRANSITION } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "br-metric-card-expanded:";

/**
 * Same synchronous-read pattern `CollapsibleSection`/`SplashScreen` already
 * use — reads the real stored preference before paint on the client, no
 * flash. `fallback` (PR-083 addendum) is returned only when nothing has
 * been stored yet, so a card with `defaultExpanded` doesn't get immediately
 * re-collapsed by this same read on a first-time visitor — a real stored
 * `"0"`/`"1"` (the user's own later choice) always wins over it.
 */
function readStoredExpanded(id: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
    return stored === null ? fallback : stored === "1";
  } catch {
    return fallback;
  }
}

export type ExpandableMetricCardProps = {
  /** Stable, unique key for this card's remembered expand state — e.g. `"overview-price"`, `"key-signal-category-rank"`. */
  id: string;
  /** Pre-rendered icon element (e.g. `<Trophy className="size-3" />`), not a component reference — this card is a Client Component and Server Component callers can't pass a component/function across that boundary, only already-rendered JSX. */
  icon?: ReactNode;
  label: string;
  /** Always-visible collapsed summary value — the one number a reader glances at without expanding anything. */
  value: ReactNode;
  /** Small muted helper line under `value`, shown collapsed or expanded (e.g. a 24h change badge). Optional. */
  helper?: ReactNode;
  unavailable?: boolean;
  /** Richer content shown only once expanded — mini-chart, breakdowns, additional stats. */
  expandedContent: ReactNode;
  /** Tiny muted attribution shown at the bottom of the expanded state (e.g. "CoinGecko", "DefiLlama") — every expanded card should name its data source (PR-079 Section 2). */
  sourceLabel?: string;
  className?: string;
  /** Override for the collapsed `value` slot's typography — lets the page's single most important metric (Price) read at hero size while every other card stays at the default tile size, without forking this component. */
  valueClassName?: string;
  /** PR-083 addendum — starts this specific card expanded on a visitor's very first render (before they've ever toggled it themselves). Defaults to `false`, so every existing caller is unaffected. A user's own later explicit choice, once stored, always overrides this on subsequent visits. */
  defaultExpanded?: boolean;
};

/**
 * PR-079 — the shared expand/collapse card primitive behind every
 * "interactive metric card" requirement in the Project Details redesign
 * (Overview metrics, Key Signals). Modeled directly on
 * `components/projects/CollapsibleSection.tsx`'s SSR-safe,
 * localStorage-persisted, `framer-motion` pattern, but card-scoped (a
 * bordered tile, not a full-width page section) and defaulting to
 * *collapsed* (a section like Base Today defaults open since it's the
 * whole page's content; a metric card's expanded detail is supplementary,
 * so it starts hidden until the reader asks for it).
 *
 * Deliberately placed in `components/ui/` rather than `components/explorer/`
 * — it has zero Project-Details-specific assumptions, so future screens
 * (Watchlist, Automation, Compare) can reuse it directly.
 */
export function ExpandableMetricCard({
  id,
  icon,
  label,
  value,
  helper,
  unavailable = false,
  expandedContent,
  sourceLabel,
  className,
  valueClassName,
  defaultExpanded = false,
}: ExpandableMetricCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setExpanded(readStoredExpanded(id, defaultExpanded));
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [id, defaultExpanded]);

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, next ? "1" : "0");
    } catch {
      // Storage unavailable (private browsing, quota) — toggle still works for this session.
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 shadow-sm transition-[box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.02]",
        unavailable && "opacity-70",
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="flex cursor-pointer items-start justify-between gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
            {icon}
            {label}
          </span>
          <span
            className={cn(
              "truncate text-base font-bold tabular-nums text-radar-light-text dark:text-radar-white",
              unavailable && "text-radar-light-muted dark:text-radar-muted",
              valueClassName
            )}
          >
            {value}
          </span>
          {helper && <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">{helper}</span>}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-3.5 shrink-0 text-radar-light-muted transition-transform duration-200 dark:text-radar-muted",
            expanded && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={hydrated ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EXPAND_TRANSITION}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 border-t border-radar-light-border pt-2 dark:border-white/10">
              {expandedContent}
              {/* UX polish pass, Section 14 — reduced from "Source: {label}" to just the muted label itself; less visual weight, same information. */}
              {sourceLabel && <span className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/60">{sourceLabel}</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
