import { ArrowUpDown } from "lucide-react";

import { SORT_OPTIONS, sortOptionValue, type SortState } from "@/components/explorer/sort";

type ExplorerSortProps = {
  value: SortState;
  onChange: (value: SortState) => void;
};

/**
 * PR1's only functional Toolbar control — docs/explorer/06 §4 (PR1
 * acceptance criteria). Filter, View, and Mode controls are visibly
 * absent, not disabled placeholders; they belong to later PRs.
 */
export function ExplorerSort({ value, onChange }: ExplorerSortProps) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <ArrowUpDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <label htmlFor="explorer-sort" className="sr-only">
        Sort projects
      </label>
      <select
        id="explorer-sort"
        value={sortOptionValue(value)}
        onChange={(event) => {
          const option = SORT_OPTIONS.find((o) => o.value === event.target.value);
          if (option) onChange(option.state);
        }}
        className="bg-transparent text-sm text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
