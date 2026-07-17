"use client";

import { ArrowUpDown } from "lucide-react";

import { CATEGORY_LABEL, SEVERITY_LABEL } from "@/components/alerts/meta";
import { ALERT_CATEGORIES, ALERT_SEVERITIES } from "@/lib/alerts/types";
import type { AlertCategory, AlertSeverity, AlertSortOrder, AlertStatusFilter } from "@/lib/alerts/types";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

type AlertFiltersProps = {
  status: AlertStatusFilter;
  onStatusChange: (status: AlertStatusFilter) => void;
  severity: AlertSeverity | "all";
  onSeverityChange: (severity: AlertSeverity | "all") => void;
  category: AlertCategory | "all";
  onCategoryChange: (category: AlertCategory | "all") => void;
  projectId: string;
  onProjectIdChange: (projectId: string) => void;
  projectOptions: ProjectOption[];
  sort: AlertSortOrder;
  onSortChange: (sort: AlertSortOrder) => void;
  counts: { all: number; unread: number; pinned: number };
};

const STATUS_TABS: { value: AlertStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "pinned", label: "Pinned" },
];

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

/**
 * GitHub-Issues-style filter row: an All/Unread/Pinned status tab group
 * (each with a live count) plus Severity/Category/Project dropdowns and a
 * Newest/Oldest sort toggle. No search box yet — explicitly out of this
 * PR's scope. Fully controlled: every value lives in `AlertsPageClient`.
 */
export function AlertFilters({
  status,
  onStatusChange,
  severity,
  onSeverityChange,
  category,
  onCategoryChange,
  projectId,
  onProjectIdChange,
  projectOptions,
  sort,
  onSortChange,
  counts,
}: AlertFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div
        role="group"
        aria-label="Filter by status"
        className="flex items-center gap-1 rounded-xl border border-radar-light-border bg-radar-light-surface p-1 dark:border-white/10 dark:bg-white/5"
      >
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={status === tab.value}
            onClick={() => onStatusChange(tab.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
              status === tab.value
                ? "bg-radar-primary/10 text-radar-primary dark:bg-radar-primary/15 dark:text-radar-accent"
                : "text-radar-light-muted hover:text-radar-light-text dark:text-radar-muted dark:hover:text-radar-white"
            )}
          >
            {tab.label}
            <span className="tabular-nums opacity-70">{counts[tab.value]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="alert-filter-severity">
          Filter by severity
        </label>
        <select
          id="alert-filter-severity"
          value={severity}
          onChange={(event) => onSeverityChange(event.target.value as AlertSeverity | "all")}
          className={SELECT_CLASS}
        >
          <option value="all">All Severities</option>
          {ALERT_SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {SEVERITY_LABEL[value]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="alert-filter-category">
          Filter by category
        </label>
        <select
          id="alert-filter-category"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as AlertCategory | "all")}
          className={SELECT_CLASS}
        >
          <option value="all">All Categories</option>
          {ALERT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABEL[value]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="alert-filter-project">
          Filter by project
        </label>
        <select
          id="alert-filter-project"
          value={projectId}
          onChange={(event) => onProjectIdChange(event.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">All Projects</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
          <ArrowUpDown className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <label htmlFor="alert-filter-sort" className="sr-only">
            Sort alerts
          </label>
          <select
            id="alert-filter-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as AlertSortOrder)}
            className="bg-transparent text-xs font-medium text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>
    </div>
  );
}
