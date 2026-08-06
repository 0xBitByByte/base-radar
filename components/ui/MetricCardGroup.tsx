"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { FADE_TRANSITION } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

export type MetricTile = {
  /** Stable, unique key for this tile within its group. */
  id: string;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  unavailable?: boolean;
  /** Content shown in the one shared panel below the grid when this tile is selected. */
  expandedContent: ReactNode;
  sourceLabel?: string;
  className?: string;
  valueClassName?: string;
};

type MetricCardGroupProps = {
  tiles: MetricTile[];
  /** Grid layout for the tile row — defaults to the Overview cards' 2x3 responsive grid. */
  gridClassName?: string;
};

/**
 * UX polish pass, Section 2 — the Overview metric tiles no longer expand
 * independently (that was `ExpandableMetricCard`, still used elsewhere for
 * Category Rank/etc.). Here, clicking a tile selects it (highlighted) and
 * opens ONE shared detail panel below the grid; clicking a different tile
 * swaps the panel's content with a smooth crossfade instead of stacking a
 * second expanded card — clicking the already-selected tile closes the
 * panel. This keeps at most one metric's detail on screen at a time, so the
 * page never grows six independently-expanded cards' worth of layout jump.
 *
 * Deliberately a new, generic primitive in `components/ui/` (not a variant
 * of `ExpandableMetricCard`) — the two have genuinely different interaction
 * models (independent multi-expand vs. single-selection-with-shared-panel),
 * and forcing one component to do both would need a mode flag threaded
 * through every call site for no real reuse benefit.
 */
export function MetricCardGroup({ tiles, gridClassName }: MetricCardGroupProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tiles.find((tile) => tile.id === selectedId) ?? null;

  function toggle(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  return (
    // PR-080 Task 5 — tightened from `gap-2.5` to `gap-1.5` between the tile
    // grid and the panel so the two read as physically closer/attached.
    <div className="flex flex-col gap-1.5">
      <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", gridClassName)}>
        {tiles.map((tile) => {
          const isSelected = tile.id === selectedId;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => toggle(tile.id)}
              aria-pressed={isSelected}
              aria-expanded={isSelected}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border p-3 text-left shadow-sm transition-[box-shadow,transform,border-color,background-color] duration-150 ease-out outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                isSelected
                  ? "border-radar-primary/50 bg-radar-primary/5 dark:border-radar-accent/50 dark:bg-radar-accent/5"
                  : "border-radar-light-border bg-radar-light-surface dark:border-white/10 dark:bg-white/[0.02]",
                tile.unavailable && "opacity-70",
                tile.className
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[10.5px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
                  {tile.icon}
                  {tile.label}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 text-radar-light-muted transition-transform duration-200 dark:text-radar-muted",
                    isSelected && "rotate-180"
                  )}
                  aria-hidden="true"
                />
              </span>
              <span
                className={cn(
                  "truncate text-base font-bold tabular-nums text-radar-light-text dark:text-radar-white",
                  tile.unavailable && "text-radar-light-muted dark:text-radar-muted",
                  tile.valueClassName
                )}
              >
                {tile.value}
              </span>
              {tile.helper && <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">{tile.helper}</span>}
            </button>
          );
        })}
      </div>

      {/*
        PR-080 Task 5 — the panel is styled to visually belong to the
        selected tile above it rather than reading as a separate, unrelated
        card: its border and background match the tile's own selected-state
        accent exactly (not just a lighter tint), and a colored top seam
        reinforces the connection. Kept deliberately non-JS (no per-tile
        position calculation or connector arrow pointing at the tile) —
        restrained, not an over-designed callout.

        Keyed by `selected.id` directly on the animated element (no
        `AnimatePresence mode="wait"` wrapper) — a changed key always forces
        React to unmount the old subtree and mount a fresh one, so swapping
        between two different selected tiles reliably shows the new tile's
        content instead of the previous one's.
      */}
      {selected && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={FADE_TRANSITION}
          className="flex flex-col gap-2 rounded-xl border border-t-2 border-radar-primary/50 border-t-radar-primary/70 bg-radar-primary/5 p-3 dark:border-radar-accent/50 dark:border-t-radar-accent/70 dark:bg-radar-accent/5"
        >
          {selected.expandedContent}
          {selected.sourceLabel && (
            <span className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/60">{selected.sourceLabel}</span>
          )}
        </motion.div>
      )}
    </div>
  );
}
