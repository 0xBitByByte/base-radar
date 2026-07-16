"use client";

import { Info } from "lucide-react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { cn } from "@/lib/utils";
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
export function MetricItem({ label, value, unavailable, className, infoTooltip, bare, emphasize, changeValue }: MetricItemProps) {
  const hasChangeValue = changeValue !== undefined;
  const isUnavailable = hasChangeValue ? unavailable || changeValue === null : unavailable || !value;

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        !bare && "rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]",
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
              className="text-radar-light-muted/60 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/50 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
            >
              <Info className="size-3" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </span>
      {hasChangeValue ? (
        <ChangeValue
          value={changeValue}
          className={cn("font-semibold", emphasize ? "text-xl font-bold tracking-tight" : "text-sm")}
        />
      ) : (
        <span
          className={cn(
            "font-semibold tabular-nums",
            emphasize ? "text-xl font-bold tracking-tight" : "text-sm",
            isUnavailable ? "text-radar-light-muted dark:text-radar-muted" : "text-radar-light-text dark:text-radar-white"
          )}
        >
          {isUnavailable ? "—" : value}
        </span>
      )}
    </div>
  );
}
