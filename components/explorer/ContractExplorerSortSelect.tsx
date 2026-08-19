"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpDown } from "lucide-react";

import { buildContractsQuery, type ContractSortField, type ContractsQueryState, type SortOrder } from "@/lib/contracts/queryState";

type SortOption = { value: string; label: string; field: ContractSortField; order: SortOrder };

const SORT_OPTIONS: SortOption[] = [
  { value: "type-asc", label: "Type (A–Z)", field: "type", order: "asc" },
  { value: "type-desc", label: "Type (Z–A)", field: "type", order: "desc" },
  { value: "verified-desc", label: "Verified First", field: "verified", order: "desc" },
  { value: "verified-asc", label: "Not Verified First", field: "verified", order: "asc" },
  { value: "address-asc", label: "Address (A–Z)", field: "address", order: "asc" },
  { value: "address-desc", label: "Address (Z–A)", field: "address", order: "desc" },
];

function sortValueFor(field: ContractSortField, order: SortOrder): string {
  return `${field}-${order}`;
}

type ContractExplorerSortSelectProps = {
  state: ContractsQueryState;
};

/** PR-084.03 — mirrors `PoolExplorerSortSelect.tsx`'s exact pattern, adapted to contract fields. Only writes `?sortField=`/`?sortOrder=`; the actual sort runs server-side in `[slug]/contracts/page.tsx`. */
export function ContractExplorerSortSelect({ state }: ContractExplorerSortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const value = sortValueFor(state.sortField, state.sortOrder);

  function handleChange(nextValue: string) {
    const option = SORT_OPTIONS.find((candidate) => candidate.value === nextValue);
    if (!option) return;
    startTransition(() => {
      router.push(`${pathname}${buildContractsQuery(state, { sortField: option.field, sortOrder: option.order })}`, { scroll: false });
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <ArrowUpDown className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <label htmlFor="contracts-sort" className="sr-only">
        Sort contracts
      </label>
      <select
        id="contracts-sort"
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
