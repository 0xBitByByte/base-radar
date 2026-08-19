"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

import { ClearFiltersButton } from "@/components/explorer/ClearFiltersButton";
import { FilterGroup } from "@/components/explorer/FilterGroup";
import { formatLabel } from "@/components/explorer/format";
import { getChainBrand } from "@/lib/branding/chains";
import { buildContractsQuery, type ContractsQueryState } from "@/lib/contracts/queryState";

type ContractExplorerFilterBarProps = {
  state: ContractsQueryState;
  /** Every real, distinct chain present across this project's registered contracts — only shown when a project genuinely spans more than one, mirroring Pools' `availableDexes.length > 1` DEX filter exactly. */
  availableChains: string[];
};

function formatChainLabel(chain: string): string {
  return getChainBrand(chain)?.label ?? formatLabel(chain);
}

/**
 * PR-084.03 — mirrors `PoolExplorerFilterBar.tsx` exactly: reuses
 * `FilterGroup`/`ClearFiltersButton` directly (both generic), local search
 * input instead of the orphaned `ExplorerSearch` (wrong hardcoded copy).
 * `formatChainLabel` is a local function, not a prop — plain functions
 * can't cross the Server→Client boundary as props (RSC serialization),
 * the exact bug caught and fixed in PR-084.02.
 */
export function ContractExplorerFilterBar({ state, availableChains }: ContractExplorerFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function navigate(overrides: Partial<ContractsQueryState>) {
    startTransition(() => {
      router.push(`${pathname}${buildContractsQuery(state, overrides)}`, { scroll: false });
    });
  }

  const hasActiveFilters = state.search.length > 0 || state.chain.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 transition-colors focus-within:border-radar-primary/50 focus-within:ring-2 focus-within:ring-radar-primary/30 dark:border-white/10 dark:bg-white/5">
        <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          type="text"
          value={state.search}
          onChange={(event) => navigate({ search: event.target.value })}
          placeholder="Search contracts by label, address, or type"
          aria-label="Search contracts"
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

      {availableChains.length > 1 && (
        <FilterGroup
          label="Chain"
          options={availableChains}
          selected={state.chain}
          onChange={(chain) => navigate({ chain })}
          formatOption={formatChainLabel}
        />
      )}

      {hasActiveFilters && <ClearFiltersButton onClick={() => navigate({ search: "", chain: [] })} />}
    </div>
  );
}
