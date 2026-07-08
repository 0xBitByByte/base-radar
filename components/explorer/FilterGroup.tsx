"use client";

import { cn } from "@/lib/utils";

type FilterGroupProps<T extends string> = {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
  formatOption?: (value: T) => string;
};

/**
 * One filter facet's checkbox picker — docs/explorer/04-component-specification.md
 * §8. Fully stateless: the selected set lives in `ExplorerPageClient`; this
 * component only ever reports the next array via `onChange`. Generic so the
 * same component serves Category, Verification, Health, and Confidence
 * without four near-identical copies.
 */
export function FilterGroup<T extends string>({ label, options, selected, onChange, formatOption }: FilterGroupProps<T>) {
  if (options.length === 0) return null;

  function toggle(value: T) {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold text-radar-light-muted dark:text-radar-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-radar-primary/50 has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-radar-light-surface dark:has-[:focus-visible]:ring-offset-radar-card",
                checked
                  ? "border-radar-primary/30 bg-radar-primary/10 text-radar-primary"
                  : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
              )}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(option)} className="sr-only" />
              {formatOption ? formatOption(option) : option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
