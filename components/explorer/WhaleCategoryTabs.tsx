"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { WHALE_CATEGORIES, type WhaleCategoryId } from "@/components/explorer/whaleIntelligenceHelpers";
import { Tooltip } from "@/components/ui/Tooltip";
import { buildWhaleQuery, type WhaleQueryState } from "@/lib/whale/queryState";
import { cn } from "@/lib/utils";

type WhaleCategoryTabsProps = {
  state: WhaleQueryState;
  /** Real count per category, computed once by the page over the full fetched transfer set. */
  counts: Record<WhaleCategoryId, number>;
};

/**
 * PR-084.05 — hides empty categories, following Contract/Governance
 * Intelligence's precedent: detection is capped at 10 scanned transfers per
 * token, so most of these 7 categories are honestly empty for most real
 * projects most of the time.
 */
export function WhaleCategoryTabs({ state, counts }: WhaleCategoryTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function navigate(category: WhaleCategoryId) {
    startTransition(() => {
      router.push(`${pathname}${buildWhaleQuery(state, { category })}`, { scroll: false });
    });
  }

  const visibleCategories = WHALE_CATEGORIES.filter((category) => (counts[category.id] ?? 0) > 0);

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
