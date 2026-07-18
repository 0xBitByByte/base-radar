"use client";

import { ArrowUpDown, Search } from "lucide-react";

import { OPPORTUNITY_SORT_LABEL, OPPORTUNITY_SORTS, SECTION_FILTER_LABEL, SECTION_FILTERS } from "@/components/brief/filters";
import type { OpportunitySort, SectionFilterValue } from "@/components/brief/filters";
import { cn } from "@/lib/utils";

type BriefFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  sectionFilter: SectionFilterValue;
  onSectionFilterChange: (value: SectionFilterValue) => void;
  opportunitySort: OpportunitySort;
  onOpportunitySortChange: (value: OpportunitySort) => void;
  /** Hides the sort control when the Top Opportunities section isn't currently visible — no point sorting a section the user isn't looking at. */
  showOpportunitySort: boolean;
};

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

/**
 * The Daily Brief page's own search/filter/sort bar — same visual language
 * as `components/alerts/IntelligenceFilters.tsx` (search box + selects +
 * a sort chip), reused rather than reinvented. `sectionFilter` narrows
 * which sections `DailyBrief.tsx` renders; `search` further narrows the
 * items within whatever sections remain visible. Both are pure UI state —
 * neither ever triggers a Daily Brief rebuild.
 */
export function BriefFilters({
  search,
  onSearchChange,
  sectionFilter,
  onSectionFilterChange,
  opportunitySort,
  onOpportunitySortChange,
  showOpportunitySort,
}: BriefFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="brief-filter-search">
        Search Daily Brief
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 sm:max-w-[220px]",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Search className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          id="brief-filter-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search the brief..."
          className="min-w-0 flex-1 bg-transparent text-xs text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
      </div>

      <label className="sr-only" htmlFor="brief-filter-section">
        Filter by section
      </label>
      <select
        id="brief-filter-section"
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

      {showOpportunitySort && (
        <div className="flex items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
          <ArrowUpDown className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <label htmlFor="brief-filter-sort" className="sr-only">
            Sort Top Opportunities
          </label>
          <select
            id="brief-filter-sort"
            value={opportunitySort}
            onChange={(event) => onOpportunitySortChange(event.target.value as OpportunitySort)}
            className="bg-transparent text-xs font-medium text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
          >
            {OPPORTUNITY_SORTS.map((value) => (
              <option key={value} value={value}>
                {OPPORTUNITY_SORT_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
