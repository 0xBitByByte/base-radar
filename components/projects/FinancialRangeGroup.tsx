"use client";

import { cn } from "@/lib/utils";
import type { FinancialRangeDef, FinancialRangeId } from "@/lib/projects/types";

type FinancialRangeGroupProps = {
  label: string;
  ranges: FinancialRangeDef[];
  selected: FinancialRangeId | null;
  onChange: (next: FinancialRangeId | null) => void;
};

/**
 * PR-063 — Task 2/5: one financial metric's range picker. Unlike
 * `FilterGroup` (checkbox, OR-within-facet), the buckets within one metric
 * are mutually exclusive — TVL can't be both "< $1M" and "$1M–10M" — so this
 * is single-select: clicking the active pill again clears it back to "no
 * constraint," clicking a different pill replaces the selection outright.
 */
export function FinancialRangeGroup({ label, ranges, selected, onChange }: FinancialRangeGroupProps) {
  if (ranges.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold text-radar-light-muted dark:text-radar-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => {
          const checked = selected === range.id;
          return (
            <button
              key={range.id}
              type="button"
              onClick={() => onChange(checked ? null : range.id)}
              aria-pressed={checked}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                checked
                  ? "border-radar-primary/30 bg-radar-primary/10 text-radar-primary"
                  : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
              )}
            >
              {range.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
