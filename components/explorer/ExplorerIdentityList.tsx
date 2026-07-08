import { IdentityRow } from "@/components/explorer/IdentityRow";
import { NoResultsState } from "@/components/explorer/NoResultsState";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ExplorerIdentityListProps = {
  projects: ProjectIntelligence[];
  onClearSearch: () => void;
};

/**
 * PR1's entire Results Area — a plain identity list. Grid View and Table
 * View (docs/explorer/03 §8/§9) are later PRs; this renders neither.
 */
export function ExplorerIdentityList({ projects, onClearSearch }: ExplorerIdentityListProps) {
  if (projects.length === 0) {
    return <NoResultsState onClearSearch={onClearSearch} />;
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
