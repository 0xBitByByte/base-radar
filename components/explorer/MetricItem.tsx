import { cn } from "@/lib/utils";

type MetricItemProps = {
  label: string;
  value?: string;
  unavailable?: boolean;
  className?: string;
};

/**
 * A label + value pair — the building block of `ProjectMetricsGrid`, and,
 * per docs/explorer/04-component-specification.md §13, reusable well
 * beyond Explorer (Quick View, Compare, Portfolio). Presentation only:
 * formatting the `value` string is always the caller's job, never this
 * component's — it only ever renders a string it's given, or an explicit
 * "unavailable" treatment, never a fabricated placeholder.
 */
export function MetricItem({ label, value, unavailable, className }: MetricItemProps) {
  const isUnavailable = unavailable || !value;

  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]",
        className
      )}
    >
      <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">{label}</span>
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
