import { ExplorerGridLayout } from "@/components/explorer/ExplorerGridLayout";
import { ProjectCard } from "@/components/explorer/ProjectCard";
import { NoResultsState } from "@/components/explorer/NoResultsState";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ExplorerGridProps = {
  projects: ProjectIntelligence[];
  hasQuery: boolean;
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
  onActivate?: (project: ProjectIntelligence) => void;
};

/**
 * Explorer's Results Area (docs/explorer/03-screen-specifications.md §8) —
 * replaces PR1's plain identity list.
 */
export function ExplorerGrid({
  projects,
  hasQuery,
  hasFilters,
  onClearSearch,
  onClearFilters,
  onActivate,
}: ExplorerGridProps) {
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
    <ExplorerGridLayout>
      {projects.map((project) => (
        <ProjectCard
          key={project.identity.id}
          project={project}
          onActivate={onActivate ? () => onActivate(project) : undefined}
        />
      ))}
    </ExplorerGridLayout>
  );
}
