"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDown } from "lucide-react";

import { buildWhaleQuery, type WhaleSortField, type WhaleQueryState, type SortOrder } from "@/lib/whale/queryState";

type SortOption = { value: string; label: string; field: WhaleSortField; order: SortOrder };

const SORT_OPTIONS: SortOption[] = [
  { value: "timestamp-desc", label: "Time (Newest)", field: "timestamp", order: "desc" },
  { value: "timestamp-asc", label: "Time (Oldest)", field: "timestamp", order: "asc" },
  { value: "usdValue-desc", label: "USD Value (High to Low)", field: "usdValue", order: "desc" },
  { value: "usdValue-asc", label: "USD Value (Low to High)", field: "usdValue", order: "asc" },
];

function sortValueFor(field: WhaleSortField, order: SortOrder): string {
  return `${field}-${order}`;
}

type WhaleExplorerSortSelectProps = {
  state: WhaleQueryState;
};

/** PR-084.05 — mirrors `GovernanceExplorerSortSelect.tsx`'s exact pattern. Only writes `?sortField=`/`?sortOrder=`; the actual sort runs server-side in `[slug]/whale/page.tsx`. */
export function WhaleExplorerSortSelect({ state }: WhaleExplorerSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const value = sortValueFor(state.sortField, state.sortOrder);

  function handleChange(nextValue: string) {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === nextValue);
    if (!option) return;
    startTransition(() => {
      router.push(`${pathname}${buildWhaleQuery(state, { sortField: option.field, sortOrder: option.order })}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <ArrowUpDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <label htmlFor="whale-sort" className="sr-only">
        Sort whale transfers
      </label>
      <select
        id="whale-sort"
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
