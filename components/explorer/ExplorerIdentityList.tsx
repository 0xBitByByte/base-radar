import { IdentityRow } from "@/components/explorer/IdentityRow";
import { NoResultsState } from "@/components/explorer/NoResultsState";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ExplorerIdentityListProps = {
  projects: ProjectIntelligence[];
  hasQuery: boolean;
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
};

/**
 * Superseded by `ExplorerGrid` (PR4 — Grid View). Retained temporarily,
 * unreferenced, for rollback safety — scheduled for removal in a
 * follow-up cleanup PR once Grid View has been merged and verified.
 *
 * PR1's entire Results Area — a plain identity list.
 */
export function ExplorerIdentityList({
  projects,
  hasQuery,
  hasFilters,
  onClearSearch,
  onClearFilters,
}: ExplorerIdentityListProps) {
  if (projects.length === 0) {
    return (
      <NoResultsState
        hasQuery={hasQuery}
        hasFilters={hasFilters}
        onClearSearch={onClearSearch}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <ul
      aria-label="Projects"
      className="divide-y divide-radar-light-border overflow-hidden rounded-2xl border border-radar-light-border dark:divide-white/10 dark:border-white/10"
    >
      {projects.map((project) => (
        <IdentityRow key={project.identity.id} project={project} />
      ))}
    </ul>
  );
}
