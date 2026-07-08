import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type NoResultsStateProps = {
  hasQuery: boolean;
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
};

const ACTION_BUTTON_CLASS =
  "rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5";

/**
 * The "search and/or filters matched zero projects" state — docs/explorer/03
 * §10/§18. Search and filters are two different causes of the same
 * designed-for outcome; whichever is active gets its own recovery action
 * (both, if both are active), per docs/explorer/06 §4's PR3 criteria.
 */
export function NoResultsState({ hasQuery, hasFilters, onClearSearch, onClearFilters }: NoResultsStateProps) {
  const title =
    hasQuery && hasFilters
      ? "No projects match your search and filters"
      : hasFilters
        ? "No projects match your filters"
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
