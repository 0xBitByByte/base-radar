"use client";

import { ArrowUpDown, Search } from "lucide-react";

import {
  NOTIFICATION_READ_FILTER_LABEL,
  NOTIFICATION_READ_FILTERS,
  NOTIFICATION_SORT_LABEL,
  NOTIFICATION_SORTS,
  NOTIFICATION_TYPE_FILTER_LABEL,
  type NotificationReadFilter,
  type NotificationSort,
} from "@/components/notifications/filters";
import { TIMELINE_EVENT_TYPES } from "@/lib/timeline/types";
import type { NotificationType } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type NotificationFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  readState: NotificationReadFilter;
  onReadStateChange: (value: NotificationReadFilter) => void;
  type: NotificationType | "all";
  onTypeChange: (value: NotificationType | "all") => void;
  sort: NotificationSort;
  onSortChange: (value: NotificationSort) => void;
};

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

/**
 * The Notification Center's search/filter/sort bar — same visual language
 * as `TimelineFilters`/`BriefFilters`/`PortfolioFilters` (search box +
 * selects + a sort chip). `readState` narrows to All/Unread/Read; `type`
 * narrows to one of the 10 notification types (reusing `NotificationType`,
 * the exact same union `TimelineEventType` uses); `sort` reorders the
 * filtered set (Newest/Oldest/Highest Priority) — added in PR19 Part 3.
 */
export function NotificationFilters({
  search,
  onSearchChange,
  readState,
  onReadStateChange,
  type,
  onTypeChange,
  sort,
  onSortChange,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="notification-filter-search">
        Search notifications
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 sm:max-w-[220px]",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Search className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          id="notification-filter-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search notifications..."
          className="min-w-0 flex-1 bg-transparent text-xs text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
      </div>

      <label className="sr-only" htmlFor="notification-filter-read-state">
        Filter by read state
      </label>
      <select
        id="notification-filter-read-state"
        value={readState}
        onChange={(event) => onReadStateChange(event.target.value as NotificationReadFilter)}
        className={SELECT_CLASS}
      >
        {NOTIFICATION_READ_FILTERS.map((value) => (
          <option key={value} value={value}>
            {NOTIFICATION_READ_FILTER_LABEL[value]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="notification-filter-type">
        Filter by type
      </label>
      <select
        id="notification-filter-type"
        value={type}
        onChange={(event) => onTypeChange(event.target.value as NotificationType | "all")}
        className={SELECT_CLASS}
      >
        <option value="all">All Types</option>
        {TIMELINE_EVENT_TYPES.map((value) => (
          <option key={value} value={value}>
            {NOTIFICATION_TYPE_FILTER_LABEL[value]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
        <ArrowUpDown className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <label htmlFor="notification-filter-sort" className="sr-only">
          Sort notifications
        </label>
        <select
          id="notification-filter-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as NotificationSort)}
          className="bg-transparent text-xs font-medium text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
        >
          {NOTIFICATION_SORTS.map((value) => (
            <option key={value} value={value}>
              {NOTIFICATION_SORT_LABEL[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
