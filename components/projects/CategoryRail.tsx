"use client";

/**
 * PR-057 — Task 5: Category Rail. One card per real `ProjectCategory`
 * (`data/projects/enums.ts`, 22 values) — a fixed, small enum that doesn't
 * grow with data volume, so every category renders even at zero matches
 * (de-emphasized, not hidden — hiding buys nothing at scale and costs a
 * user's mental model of "these are the verticals this product tracks,"
 * per `docs/PR-055_PROJECTS_PAGE_UX_ARCHITECTURE.md` §3).
 *
 * PR-058 — Task 2: each card is now a real link toggling that category in
 * the shared `?category=` list (`components/projects/queryState.ts`) — the
 * same state the Filter Panel's own "Category" `FilterGroup` reads and
 * writes, so the rail and the panel can never drift into two competing
 * ideas of "which categories are selected."
 *
 * PR-059 — Task 6: reduce visual noise by defaulting to the most active
 * categories first (sorted by each category's own real, already-computed
 * count — never fabricated) and capping the initial row to `VISIBLE_CAP`,
 * with a real "Show All"/"Show Less" toggle for the rest. A category a
 * user already has selected is never hidden by the cap, even if its count
 * is low — collapsing an active filter out of view would be confusing, not
 * decluttering. This is the one bit of local UI state on this page that
 * doesn't belong in the URL (Task 6 is a pure display preference, not
 * something worth making the page shareable by), so this component is now
 * a small client component instead of a pure server link list.
 *
 * PR-061 — Task 3: real visual hierarchy instead of one uniform grid. The
 * top `FEATURED_CAP` categories by real count become larger "featured"
 * tiles (icon, count, and a real "share of tracked projects" derived
 * purely from the same counts already computed here — never a fabricated
 * trend); the rest render as a denser, quieter compact pill list. Two
 * tiers, not twenty-two identical cards — an entry point into the
 * ecosystem's most active verticals first, everything else one click away.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";

import { buildProjectsQuery, PROJECTS_PATH, type ProjectsQueryState } from "@/components/projects/queryState";
import { PROJECT_CATEGORIES, type ProjectCategory } from "@/data/projects/enums";
import { CATEGORY_BRANDING } from "@/lib/branding/categories";
import { formatNumber, formatPercent } from "@/lib/data/format";
import { cn } from "@/lib/utils";

type CategoryRailProps = {
  byCategory: Record<ProjectCategory, { length: number }>;
  state: ProjectsQueryState;
};

const FEATURED_CAP = 4;
const VISIBLE_CAP = 10;

export function CategoryRail({ byCategory, state }: CategoryRailProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSelection = state.categories.length > 0;

  const totalTracked = PROJECT_CATEGORIES.reduce((sum, category) => sum + (byCategory[category]?.length ?? 0), 0);

  // Most active first — real counts only, stable-sorted so equal counts
  // keep the taxonomy's own declared order rather than reshuffling.
  const sortedCategories = [...PROJECT_CATEGORIES].sort(
    (a, b) => (byCategory[b]?.length ?? 0) - (byCategory[a]?.length ?? 0)
  );

  const featured = sortedCategories.slice(0, FEATURED_CAP);
  const remainder = sortedCategories.slice(FEATURED_CAP);

  const topCompact = remainder.slice(0, VISIBLE_CAP - FEATURED_CAP);
  const overflowCompact = remainder.slice(VISIBLE_CAP - FEATURED_CAP);
  // An active selection outside the visible set stays visible even collapsed — never hide a filter the user already applied.
  const forcedVisible = overflowCompact.filter((category) => state.categories.includes(category));
  const visibleCompact = expanded ? remainder : [...topCompact, ...forcedVisible];
  const hasMore = overflowCompact.length > forcedVisible.length;

  function hrefFor(category: ProjectCategory, isActive: boolean): string {
    const nextCategories = isActive ? state.categories.filter((item) => item !== category) : [...state.categories, category];
    return `${PROJECTS_PATH}${buildProjectsQuery(state, { categories: nextCategories })}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          Explore by Category
        </h2>
        <div className="flex items-center gap-3">
          {hasSelection && (
            <Link
              href={`${PROJECTS_PATH}${buildProjectsQuery(state, { categories: [] })}`}
              scroll={false}
              className="text-xs font-medium text-radar-light-muted underline-offset-2 outline-none transition-colors hover:text-radar-light-text hover:underline focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
            >
              Clear
            </Link>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              className="flex items-center gap-1 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:text-radar-white"
            >
              {expanded ? "Show Less" : `Show All (${PROJECT_CATEGORIES.length})`}
              {expanded ? <ChevronUp className="size-3.5" aria-hidden="true" /> : <ChevronDown className="size-3.5" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>

      {/* Featured tier — the most active verticals right now, given real visual weight. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {featured.map((category) => {
          const { label, Icon } = CATEGORY_BRANDING[category];
          const count = byCategory[category]?.length ?? 0;
          const isActive = state.categories.includes(category);
          const share = totalTracked > 0 ? count / totalTracked : 0;

          return (
            <Link
              key={category}
              href={hrefFor(category, isActive)}
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex flex-col gap-2.5 rounded-2xl border p-4 backdrop-blur-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                isActive
                  ? "border-radar-primary/40 bg-radar-primary/10"
                  : "border-radar-light-border bg-radar-light-card/80 hover:border-radar-primary/30 dark:border-white/10 dark:bg-radar-card/60"
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  isActive ? "bg-radar-primary/20 text-radar-primary" : "bg-radar-primary/10 text-radar-primary"
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-radar-light-text dark:text-radar-white">{label}</span>
                <span className="text-lg font-bold tabular-nums tracking-tight text-radar-light-text dark:text-radar-white">
                  {formatNumber(count)}
                </span>
                <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">
                  {count > 0 ? `${formatPercent(share * 100, { showSign: false })} of tracked projects` : "No tracked projects yet"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Compact tier — everything else, quieter and denser by design so the featured tier above reads as the entry point. */}
      {sortedCategories.length > FEATURED_CAP && (
        <div className="flex flex-wrap gap-2">
          {visibleCompact.map((category) => {
            const { label, Icon } = CATEGORY_BRANDING[category];
            const count = byCategory[category]?.length ?? 0;
            const isEmpty = count === 0;
            const isActive = state.categories.includes(category);

            return (
              <Link
                key={category}
                href={hrefFor(category, isActive)}
                scroll={false}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
                  isActive
                    ? "border-radar-primary/40 bg-radar-primary/10 text-radar-primary"
                    : "border-radar-light-border bg-radar-light-card/60 text-radar-light-text hover:border-radar-primary/30 dark:border-white/10 dark:bg-radar-card/40 dark:text-radar-white",
                  isEmpty && !isActive && "opacity-50"
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
                <span className="tabular-nums text-radar-light-muted dark:text-radar-muted">{formatNumber(count)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
