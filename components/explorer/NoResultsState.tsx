import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { describeActiveFilterSummary, type ExplorerFilters } from "@/components/explorer/filters";

type NoResultsStateProps = {
  hasQuery: boolean;
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
  /** PR-038 — when the active filter set is simple enough (≤2 facets, one value each), builds a specific "no projects match X, Y" sentence instead of the generic fallback. */
  filters?: ExplorerFilters;
};

/**
 * PR-038 — only summarizes filters cleanly when at most 2 facets are
 * active and each has exactly one selected value (e.g. "Category: Lending,
 * Chain: Base") — beyond that, stringing together clauses reads worse
 * than the existing generic message, so this returns `null` and the
 * caller falls back unchanged.
 */
function summarizeFilters(filters: ExplorerFilters | undefined): string | null {
  if (!filters) return null;
  const summary = describeActiveFilterSummary(filters);
  if (summary.length === 0 || summary.length > 2) return null;
  if (summary.some((entry) => entry.values.length !== 1)) return null;
  return summary.map((entry) => `${entry.facet}: ${entry.values[0]}`).join(", ");
}

const ACTION_BUTTON_CLASS =
  "rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5";

/**
 * The "search and/or filters matched zero projects" state — docs/explorer/03
 * §10/§18. Search and filters are two different causes of the same
 * designed-for outcome; whichever is active gets its own recovery action
 * (both, if both are active), per docs/explorer/06 §4's PR3 criteria.
 */
export function NoResultsState({ hasQuery, hasFilters, onClearSearch, onClearFilters, filters }: NoResultsStateProps) {
  const filterSummary = hasFilters ? summarizeFilters(filters) : null;

  const title =
    hasQuery && hasFilters
      ? "No projects match your search and filters"
      : hasFilters
        ? filterSummary
          ? `No projects match ${filterSummary}`
          : "No projects match your filters"
        : "No projects match your search";

  const description =
    hasQuery && hasFilters
      ? "Try a different search term, or clear your filters."
      : hasFilters
        ? "Try selecting different filter values."
        : "Try a different name, category, or tag.";

  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description={description}
      action={
        <div className="flex gap-2">
          {hasQuery && (
            <button type="button" onClick={onClearSearch} className={ACTION_BUTTON_CLASS}>
              Clear search
            </button>
          )}
          {hasFilters && (
            <button type="button" onClick={onClearFilters} className={ACTION_BUTTON_CLASS}>
              Clear filters
            </button>
          )}
        </div>
      }
    />
  );
}
