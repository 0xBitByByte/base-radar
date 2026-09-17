"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { cn } from "@/lib/utils";
import { GLASS_TILE_SURFACE } from "@/components/ui/glassStyles";
import { RichTooltip } from "@/components/ui/RichTooltip";
import { Tooltip } from "@/components/ui/Tooltip";

type MetricItemProps = {
  label: string;
  value?: string;
  unavailable?: boolean;
  className?: string;
  /** One-sentence explanation shown via an info icon beside the label; omit to render no icon. */
  infoTooltip?: string;
  /** Renders as a plain label+value stack with no border/background/padding of its own — for a group of metrics that already sit inside one shared card (Quick View). Grid/Table never pass this. */
  bare?: boolean;
  /** Bumps the value to a larger, bolder size and the label to an uppercase eyebrow, so value/label contrast reads clearly — Project Profile's metric grids only (PR11.1/PR11.2); Quick View/Grid/Table never pass this, so their sizing is unchanged. */
  emphasize?: boolean;
  /** When set (including `null`), renders via the shared `ChangeValue` (green ▲/red ▼/gray) instead of the plain `value` string — PR12.1 Req 5's consistent positive/negative coloring. Takes priority over `value`. */
  changeValue?: number | null;
  /**
   * PR-085.03 — an inline `ChangeValue` shown *alongside* `value` (never
   * replacing it, unlike `changeValue` above) — e.g. a primary metric's
   * value with its 7-day momentum annotated in the same cell: "$19.84B ▲
   * 12.4%". Per the Product Owner's explicit resolution to the §14
   * Cognitive Load Budget conflict, this keeps momentum as context on one
   * metric block rather than a second, independently-counted KPI. Ignored
   * when `changeValue` is also set (that prop already owns the cell's
   * change display). `changeAnnotationLabel` suffixes it (e.g. "(7D)").
   */
  changeAnnotation?: number | null;
  changeAnnotationLabel?: string;
  /** PR-085.03B, Finding 4 — an optional override merged onto the value span's own classes (via `cn()`, so it can add OR override individual utilities), letting a caller de-/re-emphasize one metric's typographic weight relative to its siblings without a bespoke render path. Every existing call site omits this and is visually unchanged. */
  valueClassName?: string;
  /** PR-071 Task 6 — what to render in place of `value` when unavailable. Defaults to the existing bare "—" (every pre-existing call site keeps its current look); pass `"Not Tracked"` (this app's established convention, see `ProfileTokenAndPrice.tsx`) for a caller that wants an honest, explicit phrase instead of a silent dash. Kept short deliberately — a longer phrase like "Unavailable" was found to overflow this component's narrow grid cells (PR-071 Round 3, Task 7). */
  unavailableLabel?: string;
  /** PR-086.03 — opt-in glass surface (`GLASS_TILE_SURFACE`) instead of the default flat `bg-radar-light-surface`, for callers on a page that's moved to the glass system (currently: the Pools page's stat tiles). Every other call site (21 of them app-wide) omits this and is visually unchanged — this is additive, never a default-behavior change. Ignored when `bare` is set. */
  glass?: boolean;
};

/**
 * A label + value pair — the building block of `ProjectMetricsGrid`, and,
 * per docs/explorer/04-component-specification.md §13, reusable well
 * beyond Explorer (Quick View, Compare, Portfolio). Presentation only:
 * formatting the `value` string is always the caller's job, never this
 * component's — it only ever renders a string it's given, or an explicit
 * "unavailable" treatment, never a fabricated placeholder.
 */
// Needs "use client": the info-icon button's onClick can't cross a Server->Client
// boundary when this is rendered directly from a Server Component (e.g. ProfileMetrics).
export function MetricItem({
  label,
  value,
  unavailable,
  className,
  infoTooltip,
  bare,
  emphasize,
  changeValue,
  changeAnnotation,
  changeAnnotationLabel,
  valueClassName,
  unavailableLabel = "—",
  glass,
}: MetricItemProps) {
  const hasChangeValue = changeValue !== undefined;
  const isUnavailable = hasChangeValue ? unavailable || changeValue === null : unavailable || !value;
  const showAnnotation = !hasChangeValue && changeAnnotation !== undefined && changeAnnotation !== null;

  // PR-089 — a live-polled value (`useLivePrice`/`useLiveTvl` swapping fresh
  // numbers into this same `MetricItem` every ~90s) previously just replaced
  // its old text instantly. Comparing what's actually about to render against
  // what rendered last time — not the raw props, so an unrelated re-render
  // (e.g. a sibling state change) never falsely triggers this — and briefly
  // re-playing the fade whenever it genuinely changed. A value that's never
  // re-rendered with different content (the overwhelming majority of this
  // component's call sites, all server-rendered once) never sees this fire.
  const displaySignature = hasChangeValue ? `c:${changeValue}` : `v:${isUnavailable ? unavailableLabel : value}`;
  const previousSignatureRef = useRef(displaySignature);
  const [justUpdated, setJustUpdated] = useState(false);
  useEffect(() => {
    if (previousSignatureRef.current === displaySignature) return;
    previousSignatureRef.current = displaySignature;
    setJustUpdated(true);
    const timer = setTimeout(() => setJustUpdated(false), 300);
    return () => clearTimeout(timer);
  }, [displaySignature]);

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        !bare && (glass ? cn(GLASS_TILE_SURFACE, "p-3") : "rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]"),
        className
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted",
          emphasize && "font-medium tracking-wide uppercase"
        )}
      >
        {label}
        {infoTooltip && (
          <Tooltip content={<RichTooltip description={infoTooltip} />}>
            <button
              type="button"
              onClick={(event) => event.stopPropagation()}
              aria-label={`About ${label}`}
              className="cursor-pointer text-radar-light-muted/60 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/50 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
            >
              <Info className="size-3" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </span>
      {hasChangeValue ? (
        // PR-086 — `valueClassName` now applies here too (was only merged
        // in the plain-`value` branch below), so a caller can size-match a
        // `changeValue` cell against a sibling hero-metric cell (e.g. the
        // Project Card's two-column TVL/7D layout) without a bespoke
        // render path. Every existing `changeValue` call site omits this
        // prop and is visually unchanged.
        <ChangeValue
          value={changeValue}
          className={cn(
            "font-semibold",
            emphasize ? "text-xl font-bold tracking-tight" : "text-sm",
            justUpdated && "animate-[br-metric-fade_300ms_ease-out] motion-reduce:animate-none",
            valueClassName
          )}
        />
      ) : (
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            title={isUnavailable ? unavailableLabel : value}
            className={cn(
              "font-semibold tabular-nums",
              // Product Semantics audit — a real value still truncates to
              // one line (a wrapped price/number mid-digit would look
              // broken), but an unavailable placeholder no longer does.
              // Confirmed live: "Not Tracked" at this cell's `emphasize`
              // size genuinely clipped to "Not Trac..." in a narrow
              // 2-column grid — this component's own doc comment already
              // records one prior attempt at this exact problem (shortening
              // "Unavailable" to "Not Tracked"), but a fixed-width cell
              // makes it recur at any wording long enough to matter.
              // Wrapping onto two lines, not truncating, is the real fix.
              isUnavailable ? "line-clamp-2 leading-tight break-words" : "truncate",
              emphasize ? "text-xl font-bold tracking-tight" : "text-sm",
              isUnavailable ? "text-radar-light-muted dark:text-radar-muted" : "text-radar-light-text dark:text-radar-white",
              justUpdated && "animate-[br-metric-fade_300ms_ease-out] motion-reduce:animate-none",
              valueClassName
            )}
          >
            {isUnavailable ? unavailableLabel : value}
          </span>
          {showAnnotation && (
            // PR-085.xx premium polish — a small pill instead of plain
            // trailing text, so the annotation reads as its own secondary
            // metric rather than text stuck onto the primary value. Real
            // data unchanged: still the same `ChangeValue`/`changeAnnotationLabel`.
            <span className="inline-flex shrink-0 items-baseline gap-1 rounded-md bg-radar-light-surface px-1.5 py-0.5 text-xs dark:bg-white/5">
              <ChangeValue value={changeAnnotation} className="font-semibold" />
              {changeAnnotationLabel && <span className="text-radar-light-muted dark:text-radar-muted">{changeAnnotationLabel}</span>}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
