"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDown } from "lucide-react";

import { buildPoolsQuery, type PoolsQueryState, type PoolSortField, type SortOrder } from "@/lib/pools/queryState";

type SortOption = { value: string; label: string; field: PoolSortField; order: SortOrder };

const SORT_OPTIONS: SortOption[] = [
  { value: "liquidity-desc", label: "Liquidity (High to Low)", field: "liquidity", order: "desc" },
  { value: "liquidity-asc", label: "Liquidity (Low to High)", field: "liquidity", order: "asc" },
  { value: "volume-desc", label: "24h Volume (High to Low)", field: "volume", order: "desc" },
  { value: "volume-asc", label: "24h Volume (Low to High)", field: "volume", order: "asc" },
  { value: "age-desc", label: "Age (Newest)", field: "age", order: "desc" },
  { value: "age-asc", label: "Age (Oldest)", field: "age", order: "asc" },
];

function sortValueFor(field: PoolSortField, order: SortOrder): string {
  return `${field}-${order}`;
}

type PoolExplorerSortSelectProps = {
  state: PoolsQueryState;
};

/** PR-084.02 — mirrors `components/projects/ProjectsSortSelect.tsx`'s exact pattern, adapted to pool fields. Only ever writes the `?sortField=`/`?sortOrder=` params; the actual sort runs server-side in `[slug]/pools/page.tsx`. */
export function PoolExplorerSortSelect({ state }: PoolExplorerSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const value = sortValueFor(state.sortField, state.sortOrder);

  function handleChange(nextValue: string) {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === nextValue);
    if (!option) return;
    startTransition(() => {
      router.push(`${pathname}${buildPoolsQuery(state, { sortField: option.field, sortOrder: option.order })}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <ArrowUpDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <label htmlFor="pools-sort" className="sr-only">
        Sort pools
      </label>
      <select
        id="pools-sort"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded-md bg-transparent text-sm text-radar-light-text outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-white dark:[&>option]:bg-radar-card"
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
