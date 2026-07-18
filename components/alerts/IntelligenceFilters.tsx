"use client";

import { ArrowUpDown, Search } from "lucide-react";

import { INTELLIGENCE_SORT_LABEL, NARRATIVE_LABEL, SEVERITY_FILTER_LABEL } from "@/components/alerts/meta";
import { ALERT_SEVERITIES } from "@/lib/alerts/types";
import type { AlertSeverity } from "@/lib/alerts/types";
import type { IntelligenceSortOrder } from "@/lib/alerts/service";
import { NARRATIVE_TYPES, type NarrativeType } from "@/lib/alerts/intelligence/types";
import { cn } from "@/lib/utils";

type ProjectOption = { id: string; name: string };

type IntelligenceFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  severityTier: AlertSeverity | "all";
  onSeverityTierChange: (value: AlertSeverity | "all") => void;
  narrative: NarrativeType | "all";
  onNarrativeChange: (value: NarrativeType | "all") => void;
  projectId: string;
  onProjectIdChange: (value: string) => void;
  projectOptions: ProjectOption[];
  sort: IntelligenceSortOrder;
  onSortChange: (value: IntelligenceSortOrder) => void;
};

const SELECT_CLASS =
  "rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/5 dark:text-radar-white dark:[&>option]:bg-radar-card";

const SORT_ORDER: IntelligenceSortOrder[] = ["score", "confidence", "severity", "newest"];

/**
 * The Intelligence section's own filter bar — deliberately separate from
 * `AlertFilters.tsx` (which filters raw alerts): the two sections have
 * different fields (`severityTier`/`narrative` vs. `status`/`category`) and
 * independent state in `AlertsPageClient`, so sharing one component would
 * mean threading two unrelated shapes through one prop surface. Same
 * visual language (`SELECT_CLASS`, the sort chip) reused exactly, so the
 * two filter bars read as one family.
 */
export function IntelligenceFilters({
  search,
  onSearchChange,
  severityTier,
  onSeverityTierChange,
  narrative,
  onNarrativeChange,
  projectId,
  onProjectIdChange,
  projectOptions,
  sort,
  onSortChange,
}: IntelligenceFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="intelligence-filter-search">
        Search Intelligence
      </label>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface px-2.5 py-1.5 sm:max-w-[220px]",
          "dark:border-white/10 dark:bg-white/5"
        )}
      >
        <Search className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        <input
          id="intelligence-filter-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search intelligence..."
          className="min-w-0 flex-1 bg-transparent text-xs text-radar-light-text outline-none placeholder:text-radar-light-muted dark:text-radar-white dark:placeholder:text-radar-muted"
        />
      </div>

      <label className="sr-only" htmlFor="intelligence-filter-severity">
        Filter by priority
      </label>
      <select
        id="intelligence-filter-severity"
        value={severityTier}
        onChange={(event) => onSeverityTierChange(event.target.value as AlertSeverity | "all")}
        className={SELECT_CLASS}
      >
        <option value="all">All Priorities</option>
        {ALERT_SEVERITIES.map((value) => (
          <option key={value} value={value}>
            {SEVERITY_FILTER_LABEL[value]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="intelligence-filter-narrative">
        Filter by narrative
      </label>
      <select
        id="intelligence-filter-narrative"
        value={narrative}
        onChange={(event) => onNarrativeChange(event.target.value as NarrativeType | "all")}
        className={SELECT_CLASS}
      >
        <option value="all">All Narratives</option>
        {NARRATIVE_TYPES.map((value) => (
          <option key={value} value={value}>
            {NARRATIVE_LABEL[value]}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="intelligence-filter-project">
        Filter by project
      </label>
      <select
        id="intelligence-filter-project"
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
        <label htmlFor="intelligence-filter-sort" className="sr-only">
          Sort intelligence
        </label>
        <select
          id="intelligence-filter-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as IntelligenceSortOrder)}
          className="bg-transparent text-xs font-medium text-radar-light-text outline-none dark:text-radar-white dark:[&>option]:bg-radar-card"
        >
          {SORT_ORDER.map((value) => (
            <option key={value} value={value}>
              {INTELLIGENCE_SORT_LABEL[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
