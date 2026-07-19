"use client";

import { Search } from "lucide-react";

import { AUTOMATION_PRIORITY_FILTERS } from "@/components/automation/filters";
import { AUTOMATION_ACTION_FILTER_LABEL } from "@/components/automation/meta";
import { NOTIFICATION_PRIORITY_LABEL } from "@/components/notifications/meta";
import { AUTOMATION_ACTIONS, type AutomationAction } from "@/lib/automation/types";
import type { NotificationPriority } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type AutomationFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  priority: NotificationPriority | "all";
  onPriorityChange: (value: NotificationPriority | "all") => void;
  action: AutomationAction | "all";
  onActionChange: (value: AutomationAction | "all") => void;
};

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

/**
 * The Automation Center's search/filter bar — same visual language as
 * `NotificationFilters`/`TimelineFilters` (search box + selects).
 * `priority` narrows to All/Critical/High/Medium/Low; `action` narrows to
 * one of the 5 automation actions. No sort control — results are always
 * newest-first, straight from the engine.
 */
export function AutomationFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  action,
  onActionChange,
}: AutomationFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="automation-filter-search">
        Search automation results
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 sm:max-w-[220px]",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Search className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          id="automation-filter-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search automation..."
          className="min-w-0 flex-1 bg-transparent text-xs text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
      </div>

      <label className="sr-only" htmlFor="automation-filter-priority">
        Filter by priority
      </label>
      <select
        id="automation-filter-priority"
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value as NotificationPriority | "all")}
        className={SELECT_CLASS}
      >
        <option value="all">All Priorities</option>
        {AUTOMATION_PRIORITY_FILTERS.filter((value) => value !== "all").map((value) => (
          <option key={value} value={value}>
            {NOTIFICATION_PRIORITY_LABEL[value as NotificationPriority]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="automation-filter-action">
        Filter by action
      </label>
      <select
        id="automation-filter-action"
        value={action}
        onChange={(event) => onActionChange(event.target.value as AutomationAction | "all")}
        className={SELECT_CLASS}
      >
        <option value="all">All Actions</option>
        {AUTOMATION_ACTIONS.map((value) => (
          <option key={value} value={value}>
            {AUTOMATION_ACTION_FILTER_LABEL[value]}
          </option>
        ))}
      </select>
    </div>
  );
}
