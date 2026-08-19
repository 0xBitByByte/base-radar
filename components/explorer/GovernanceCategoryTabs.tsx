"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { GOVERNANCE_CATEGORIES, type GovernanceCategoryId } from "@/components/explorer/governanceIntelligenceHelpers";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildGovernanceQuery, type GovernanceQueryState } from "@/lib/governance/queryState";
import { cn } from "@/lib/utils";

type GovernanceCategoryTabsProps = {
  state: GovernanceQueryState;
  /** Real count per category, computed once by the page over the full fetched proposal set. */
  counts: Record<GovernanceCategoryId, number>;
};

/**
 * PR-084.04 — hides empty categories, following Contract Intelligence's
 * precedent (not Pools' disable-in-place): realistic proposal counts per
 * project are small, so most of these 10 categories are honestly empty for
 * most real projects most of the time.
 */
export function GovernanceCategoryTabs({ state, counts }: GovernanceCategoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(category: GovernanceCategoryId) {
    startTransition(() => {
      router.push(`${pathname}${buildGovernanceQuery(state, { category })}`, { scroll: false });
    });
  }

  const visibleCategories = GOVERNANCE_CATEGORIES.filter((category) => (counts[category.id] ?? 0) > 0);

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
