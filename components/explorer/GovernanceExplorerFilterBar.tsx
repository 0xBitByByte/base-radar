"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

import { buildGovernanceQuery, type GovernanceQueryState } from "@/lib/governance/queryState";

type GovernanceExplorerFilterBarProps = {
  state: GovernanceQueryState;
};

/**
 * PR-084.04 — mirrors `ContractExplorerFilterBar.tsx`'s local-search
 * pattern. No second filter facet: unlike Pools' DEX or Contracts' Chain,
 * there's no natural second grouping axis for governance proposals —
 * confirmed during research, not invented here.
 */
export function GovernanceExplorerFilterBar({ state }: GovernanceExplorerFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function navigate(overrides: Partial<GovernanceQueryState>) {
    startTransition(() => {
      router.push(`${pathname}${buildGovernanceQuery(state, overrides)}`, { scroll: false });
    });
  }

  return (
    <div className="relative flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface px-3 py-2 transition-colors focus-within:border-radar-primary/50 focus-within:ring-2 focus-within:ring-radar-primary/30 dark:border-white/10 dark:bg-white/5">
      <Search className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
      <input
        type="text"
        value={state.search}
        onChange={(event) => navigate({ search: event.target.value })}
        placeholder="Search proposals by title or proposer"
        aria-label="Search governance proposals"
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
  );
}
