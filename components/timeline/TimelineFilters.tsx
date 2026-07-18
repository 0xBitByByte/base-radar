"use client";

import { ArrowUpDown, Search } from "lucide-react";

import { TIMELINE_FILTER_LABEL, TIMELINE_SORT_LABEL, TIMELINE_SORTS, type TimelineSort } from "@/components/timeline/filters";
import { TIMELINE_EVENT_TYPES } from "@/lib/timeline/types";
import type { TimelineEventType } from "@/lib/timeline/types";
import { cn } from "@/lib/utils";

type TimelineFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  eventType: TimelineEventType | "all";
  onEventTypeChange: (value: TimelineEventType | "all") => void;
  sort: TimelineSort;
  onSortChange: (value: TimelineSort) => void;
};

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

/**
 * The Timeline page's search/filter/sort bar — same visual language as
 * `IntelligenceFilters`/`BriefFilters`/`PortfolioFilters` (search box +
 * selects + a sort chip). `eventType` narrows which events `Timeline.tsx`
 * renders before grouping them into Today/Yesterday/Earlier; `search`
 * further narrows within that; `sort` reorders the filtered set. All three
 * are pure, component-local UI state — none ever trigger a Timeline
 * rebuild.
 */
export function TimelineFilters({
  search,
  onSearchChange,
  eventType,
  onEventTypeChange,
  sort,
  onSortChange,
}: TimelineFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="timeline-filter-search">
        Search Timeline
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 sm:max-w-[220px]",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Search className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          id="timeline-filter-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search the timeline..."
          className="min-w-0 flex-1 bg-transparent text-xs text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
      </div>

      <label className="sr-only" htmlFor="timeline-filter-event-type">
        Filter by event type
      </label>
      <select
        id="timeline-filter-event-type"
        value={eventType}
        onChange={(event) => onEventTypeChange(event.target.value as TimelineEventType | "all")}
        className={SELECT_CLASS}
      >
        <option value="all">All Events</option>
        {TIMELINE_EVENT_TYPES.map((value) => (
          <option key={value} value={value}>
            {TIMELINE_FILTER_LABEL[value]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
        <ArrowUpDown className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <label htmlFor="timeline-filter-sort" className="sr-only">
          Sort Timeline
        </label>
        <select
          id="timeline-filter-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as TimelineSort)}
          className="bg-transparent text-xs font-medium text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
        >
          {TIMELINE_SORTS.map((value) => (
            <option key={value} value={value}>
              {TIMELINE_SORT_LABEL[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
