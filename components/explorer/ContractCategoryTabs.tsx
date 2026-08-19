"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { CONTRACT_CATEGORIES, type ContractCategoryId } from "@/components/explorer/contractIntelligenceHelpers";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildContractsQuery, type ContractsQueryState } from "@/lib/contracts/queryState";
import { cn } from "@/lib/utils";

type ContractCategoryTabsProps = {
  state: ContractsQueryState;
  /** Real count per category, computed once by the page over the full unfiltered contract set. */
  counts: Record<ContractCategoryId, number>;
};

/**
 * PR-084.03 — unlike `PoolCategoryTabs` (which *disables* empty tabs, since
 * pools had genuine partial diversity), this *hides* empty categories
 * entirely: every real registered contract in the registry today is
 * `type: "token"`, so most of `CONTRACT_CATEGORIES`' 14 entries would render
 * as permanently-disabled dead tabs for every real project. The engine still
 * defines all of them — as the registry gains real router/factory/vault/...
 * contracts, their tabs appear here automatically, no redesign needed.
 */
export function ContractCategoryTabs({ state, counts }: ContractCategoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(category: ContractCategoryId) {
    startTransition(() => {
      router.push(`${pathname}${buildContractsQuery(state, { category })}`, { scroll: false });
    });
  }

  const visibleCategories = CONTRACT_CATEGORIES.filter((category) => (counts[category.id] ?? 0) > 0);

  return (
    <div className={cn("flex items-center gap-1.5 overflow-x-auto pb-1", isPending && "opacity-70")}>
      {visibleCategories.map((category) => {
        const active = state.category === category.id;
        const count = counts[category.id] ?? 0;
        return (
          <Tooltip key={category.id} content={category.description}>
            <button
              type="button"
              onClick={() => navigate(category.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "border-radar-primary/40 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/40 dark:bg-radar-accent/10 dark:text-radar-accent"
                  : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
              )}
            >
              <span aria-hidden="true">{category.emoji}</span>
              {category.label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
