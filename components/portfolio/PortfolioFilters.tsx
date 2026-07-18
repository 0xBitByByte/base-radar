"use client";

import { ArrowUpDown, Search } from "lucide-react";

import {
  PERFORMER_SORT_LABEL,
  PERFORMER_SORTS,
  SECTION_FILTER_LABEL,
  SECTION_FILTERS,
  type PerformerSort,
  type SectionFilterValue,
} from "@/components/portfolio/filters";
import { cn } from "@/lib/utils";

type PortfolioFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sectionFilter: SectionFilterValue;
  onSectionFilterChange: (value: SectionFilterValue) => void;
  performerSort: PerformerSort;
  onPerformerSortChange: (value: PerformerSort) => void;
  /** Hides the sort control when the Top Performers section isn't currently visible. */
  showPerformerSort: boolean;
};

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

/**
 * The Portfolio page's own search/filter/sort bar — same visual language
 * as `components/brief/BriefFilters.tsx` (search box + selects + a sort
 * chip), reused rather than reinvented. `sectionFilter` narrows which
 * sections `PortfolioOverview.tsx` renders; `search` further narrows the
 * items within whatever sections remain visible. Both are pure UI state —
 * neither ever triggers a Portfolio Intelligence rebuild.
 */
export function PortfolioFilters({
  search,
  onSearchChange,
  sectionFilter,
  onSectionFilterChange,
  performerSort,
  onPerformerSortChange,
  showPerformerSort,
}: PortfolioFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="portfolio-filter-search">
        Search Portfolio Intelligence
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 sm:max-w-[220px]",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Search className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          id="portfolio-filter-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search your portfolio..."
          className="min-w-0 flex-1 bg-transparent text-xs text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
      </div>

      <label className="sr-only" htmlFor="portfolio-filter-section">
        Filter by section
      </label>
      <select
        id="portfolio-filter-section"
        value={sectionFilter}
        onChange={(event) => onSectionFilterChange(event.target.value as SectionFilterValue)}
        className={SELECT_CLASS}
      >
        {SECTION_FILTERS.map((value) => (
          <option key={value} value={value}>
            {SECTION_FILTER_LABEL[value]}
          </option>
        ))}
      </select>

      {showPerformerSort && (
        <div className="flex items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
          <ArrowUpDown className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <label htmlFor="portfolio-filter-sort" className="sr-only">
            Sort Top Performers
          </label>
          <select
            id="portfolio-filter-sort"
            value={performerSort}
            onChange={(event) => onPerformerSortChange(event.target.value as PerformerSort)}
            className="bg-transparent text-xs font-medium text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
          >
            {PERFORMER_SORTS.map((value) => (
              <option key={value} value={value}>
                {PERFORMER_SORT_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
