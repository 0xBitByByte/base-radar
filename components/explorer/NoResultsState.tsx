import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

type NoResultsStateProps = {
  onClearSearch: () => void;
};

/** The "search matched zero projects" state — docs/explorer/03 §10/§18. */
export function NoResultsState({ onClearSearch }: NoResultsStateProps) {
  return (
    <EmptyState
      icon={SearchX}
      title="No projects match your search"
      description="Try a different name, category, or tag."
      action={
        <button
          type="button"
          onClick={onClearSearch}
          className="rounded-lg border border-radar-light-border px-3 py-1.5 text-xs font-medium text-radar-light-text outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-white dark:hover:bg-white/5"
        >
          Clear search
        </button>
      }
    />
  );
}
