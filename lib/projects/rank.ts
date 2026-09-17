/**
 * Universal Project Card, PR-1 (Product Standard §9, Category Rank).
 *
 * Zero new fetch — the whole point of Category Rank is that every project
 * in a category is already loaded together in one batch by whichever page
 * calls this (Explorer, the Directory grid). `getCategoryRank` is a pure,
 * in-memory function over a list the caller already has; it never fetches
 * anything itself, and callers must never fetch a wider list just to rank
 * one card (Performance Budget, §22).
 *
 * Ranks by `categoryAwarePrimaryMetricValue` (`lib/projects/primaryMetric.ts`)
 * — the same category-aware selection rule `LiveProjectCard` uses for its
 * own headline number, imported from the one shared module both consume,
 * never a second, independently-maintained copy.
 */

import { categoryAwarePrimaryMetricValue } from "@/lib/projects/primaryMetric";
import type { LiveProject } from "@/lib/projects/types";

export type CategoryRank = {
  /** 1-based position within `categoryPeers`, ranked by `categoryAwarePrimaryMetricValue` descending. */
  rank: number;
  /** `categoryPeers.length` — the "M" in "#N of M in {Category}". */
  total: number;
};

/**
 * `categoryPeers` must be every `LiveProject` in `project.category` the
 * caller already has loaded (e.g. `LiveProjectCollections.byCategory[project.category]`)
 * — including `project` itself. Returns `null` per §9 when the category has
 * only one member, or when `project`'s own metric is unavailable (there's
 * no honest headline number to rank next to — §19, Empty Data Philosophy).
 * Ties break by stable array order, not a designed tie-breaking rule.
 */
export function getCategoryRank(project: LiveProject, categoryPeers: LiveProject[]): CategoryRank | null {
  if (categoryPeers.length <= 1) return null;

  const ownValue = categoryAwarePrimaryMetricValue(project);
  if (ownValue === null) return null;

  const sorted = [...categoryPeers].sort((a, b) => {
    const av = categoryAwarePrimaryMetricValue(a);
    const bv = categoryAwarePrimaryMetricValue(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return bv - av;
  });

  const index = sorted.findIndex((peer) => peer.id === project.id);
  if (index === -1) return null;

  return { rank: index + 1, total: categoryPeers.length };
}
