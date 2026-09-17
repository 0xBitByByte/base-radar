import type { LucideIcon } from "lucide-react";

/**
 * One label/value stat tile for the Admin Overview — the same shape
 * `AutomationMetric`/`NotificationMetric`/`TimelineMetric`/`BriefMetric`/
 * `PortfolioMetric` already establish, kept as its own component per this
 * codebase's one-component-per-feature-area convention.
 */
type AdminMetricProps = {
  icon: LucideIcon;
  label: string;
  value: number;
  description?: string;
};

export function AdminMetric({ icon: Icon, label, value, description }: AdminMetricProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-card p-4 dark:border-white/10 dark:bg-radar-card">
      <span className="flex size-8 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
          {value.toLocaleString()}
        </span>
        <span className="text-xs font-medium text-radar-light-muted dark:text-radar-muted">{label}</span>
        {description && (
          <span className="text-[11px] leading-relaxed text-radar-light-muted/80 dark:text-radar-muted/80">{description}</span>
        )}
      </div>
    </div>
  );
}
