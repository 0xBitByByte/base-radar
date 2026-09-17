"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { POOL_CATEGORIES, type PoolCategoryId } from "@/components/explorer/pairIntelligenceHelpers";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildPoolsQuery, type PoolsQueryState } from "@/lib/pools/queryState";
import { cn } from "@/lib/utils";

type PoolCategoryTabsProps = {
  state: PoolsQueryState;
  /** Real count per category, computed once by the page over the full unfiltered pool set — never recomputed client-side. A category with 0 here can never gain pools under any search/DEX filter (filtering only narrows), so it's safe to disable rather than link to a guaranteed-empty view. */
  counts: Record<PoolCategoryId, number>;
};

/**
 * PR-084.02 — the Pool Curation Engine's `POOL_CATEGORIES` config drives
 * this tab row directly: one entry, one tab, one tooltip (`description`) —
 * no separate copy to keep in sync with the actual rule.
 */
export function PoolCategoryTabs({ state, counts }: PoolCategoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(category: PoolCategoryId) {
    startTransition(() => {
      router.push(`${pathname}${buildPoolsQuery(state, { category })}`, { scroll: false });
    });
  }

  return (
    // PR-086 — `scroll-smooth` + `snap-x`/`snap-start` on each pill (same
    // treatment as `ProfileSectionNav`'s identical horizontal-scroll nav)
    // so dragging/swiping through the category row settles on a pill
    // instead of stopping mid-scroll — real behavior improvement, not a
    // new scroll mechanism.
    <div className={cn("scroll-smooth flex snap-x items-center gap-1.5 overflow-x-auto pb-1", isPending && "opacity-70")}>
      {POOL_CATEGORIES.map((category) => {
        const active = state.category === category.id;
        const count = counts[category.id] ?? 0;
        return (
          <Tooltip key={category.id} content={category.description}>
            <button
              type="button"
              onClick={() => navigate(category.id)}
              disabled={count === 0}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-200 disabled:cursor-not-allowed disabled:opacity-40",
                active
                  ? "border-radar-primary/40 bg-radar-primary/10 text-radar-primary dark:border-radar-accent/40 dark:bg-radar-accent/10 dark:text-radar-accent"
                  : "border-radar-light-border text-radar-light-muted hover:-translate-y-0.5 hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
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
