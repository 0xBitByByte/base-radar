import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";

type MetricItemProps = {
  label: string;
  value?: string;
  unavailable?: boolean;
  className?: string;
  /** One-sentence explanation shown via an info icon beside the label; omit to render no icon. */
  infoTooltip?: string;
};

/**
 * A label + value pair — the building block of `ProjectMetricsGrid`, and,
 * per docs/explorer/04-component-specification.md §13, reusable well
 * beyond Explorer (Quick View, Compare, Portfolio). Presentation only:
 * formatting the `value` string is always the caller's job, never this
 * component's — it only ever renders a string it's given, or an explicit
 * "unavailable" treatment, never a fabricated placeholder.
 */
export function MetricItem({ label, value, unavailable, className, infoTooltip }: MetricItemProps) {
  const isUnavailable = unavailable || !value;

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]",
        className
      )}
    >
      <span className="flex items-center gap-1 text-[10.5px] text-radar-light-muted dark:text-radar-muted">
        {label}
        {infoTooltip && (
          <Tooltip content={infoTooltip}>
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
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          isUnavailable ? "text-radar-light-muted dark:text-radar-muted" : "text-radar-light-text dark:text-radar-white"
        )}
      >
        {isUnavailable ? "—" : value}
      </span>
    </div>
  );
}
