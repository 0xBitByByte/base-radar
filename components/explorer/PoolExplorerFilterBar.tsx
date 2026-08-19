"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

import { ClearFiltersButton } from "@/components/explorer/ClearFiltersButton";
import { FilterGroup } from "@/components/explorer/FilterGroup";
import { formatDexName } from "@/components/explorer/pairIntelligenceHelpers";
import { buildPoolsQuery, type PoolsQueryState } from "@/lib/pools/queryState";

type PoolExplorerFilterBarProps = {
  state: PoolsQueryState;
  /** Every real, distinct DEX id present across this project's real pools — the only options `FilterGroup` ever offers, never a hardcoded DEX list. */
  availableDexes: string[];
};

/**
 * PR-084.02 — reuses `FilterGroup`/`ClearFiltersButton` directly (both
 * genuinely generic, already reused live by `components/projects/*`). Does
 * NOT reuse `ExplorerSearch`: that component hardcodes
 * `placeholder="Search projects by name, category, or tag"` with no prop to
 * override it — reusing it here would ship literally wrong copy on a pool
 * search box, so this is a small local input mirroring its exact visual
 * recipe instead.
 *
 * `formatDexName` is imported directly here, not threaded down as a prop
 * from the Server Component page — plain functions can't cross the
 * Server→Client boundary as props (RSC serialization), only as a client
 * module's own import.
 */
export function PoolExplorerFilterBar({ state, availableDexes }: PoolExplorerFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function navigate(overrides: Partial<PoolsQueryState>) {
    startTransition(() => {
      router.push(`${pathname}${buildPoolsQuery(state, overrides)}`, { scroll: false });
    });
  }

  const hasActiveFilters = state.search.length > 0 || state.dex.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 transition-colors focus-within:border-radar-primary/50 focus-within:ring-2 focus-within:ring-radar-primary/30 dark:border-white/10 dark:bg-white/5">
        <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          type="text"
          value={state.search}
          onChange={(event) => navigate({ search: event.target.value })}
          placeholder="Search pools by pair or DEX"
          aria-label="Search pools"
          className="min-w-0 flex-1 bg-transparent text-sm text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
        {state.search && (
          <button
            type="button"
            onClick={() => navigate({ search: "" })}
            aria-label="Clear search"
            className="flex size-5 shrink-0 items-center justify-center rounded-md text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border/50 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {availableDexes.length > 1 && (
        <FilterGroup
          label="DEX"
          options={availableDexes}
          selected={state.dex}
          onChange={(dex) => navigate({ dex })}
          formatOption={formatDexName}
        />
      )}

      {hasActiveFilters && <ClearFiltersButton onClick={() => navigate({ search: "", dex: [] })} />}
    </div>
  );
}
