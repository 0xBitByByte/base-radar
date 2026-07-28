import type { FinancialSummaryEntry } from "@/components/projects/collectionPipeline";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import { formatCompactCurrency } from "@/lib/data/format";
import { FINANCIAL_METRIC_PROVIDER } from "@/lib/projects/financial";
import { FINANCIAL_METRIC_LABELS } from "@/lib/projects/types";

type FinancialSummaryProps = {
  entries: FinancialSummaryEntry[];
};

/**
 * PR-063 — Task 4/7: contextual financial stats, shown only while at least
 * one financial range filter is active. Every number here is computed from
 * the currently-visible (filtered) project set — never a fabricated or
 * registry-wide figure — by `buildDirectoryPipeline` in
 * `collectionPipeline.ts`, never recomputed here. Each card also names the
 * one provider that resolves that metric (Task 7) — never a blended value
 * across providers.
 */
export function FinancialSummary({ entries }: FinancialSummaryProps) {
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {entries.map((entry) => {
        const provider = PROVIDER_BRANDING[FINANCIAL_METRIC_PROVIDER[entry.metric]];
        return (
          <div
            key={entry.metric}
            className="flex flex-1 min-w-[220px] flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-radar-light-text dark:text-radar-white">
                {FINANCIAL_METRIC_LABELS[entry.metric]} {entry.rangeLabel}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-radar-light-muted dark:text-radar-muted">
                {provider.Icon && <provider.Icon className="size-3" />}
                {provider.label}
              </span>
            </div>
            <p className="text-xs text-radar-light-muted dark:text-radar-muted">
              {entry.count} project{entry.count === 1 ? "" : "s"} found
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">Highest</span>
                <span className="font-semibold text-radar-light-text dark:text-radar-white">{formatCompactCurrency(entry.highest)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">Average</span>
                <span className="font-semibold text-radar-light-text dark:text-radar-white">{formatCompactCurrency(entry.average)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-radar-light-muted dark:text-radar-muted">Total</span>
                <span className="font-semibold text-radar-light-text dark:text-radar-white">{formatCompactCurrency(entry.total)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
