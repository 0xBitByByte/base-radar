"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDown } from "lucide-react";

import { buildGovernanceQuery, type GovernanceSortField, type GovernanceQueryState, type SortOrder } from "@/lib/governance/queryState";

type SortOption = { value: string; label: string; field: GovernanceSortField; order: SortOrder };

const SORT_OPTIONS: SortOption[] = [
  { value: "end-desc", label: "End Date (Newest)", field: "end", order: "desc" },
  { value: "end-asc", label: "End Date (Oldest)", field: "end", order: "asc" },
  { value: "voterCount-desc", label: "Voter Count (High to Low)", field: "voterCount", order: "desc" },
  { value: "voterCount-asc", label: "Voter Count (Low to High)", field: "voterCount", order: "asc" },
];

function sortValueFor(field: GovernanceSortField, order: SortOrder): string {
  return `${field}-${order}`;
}

type GovernanceExplorerSortSelectProps = {
  state: GovernanceQueryState;
};

/** PR-084.04 — mirrors `ContractExplorerSortSelect.tsx`'s exact pattern. Only writes `?sortField=`/`?sortOrder=`; the actual sort runs server-side in `[slug]/governance/page.tsx`. */
export function GovernanceExplorerSortSelect({ state }: GovernanceExplorerSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const value = sortValueFor(state.sortField, state.sortOrder);

  function handleChange(nextValue: string) {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === nextValue);
    if (!option) return;
    startTransition(() => {
      router.push(`${pathname}${buildGovernanceQuery(state, { sortField: option.field, sortOrder: option.order })}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <ArrowUpDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <label htmlFor="governance-sort" className="sr-only">
        Sort governance proposals
      </label>
      <select
        id="governance-sort"
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
