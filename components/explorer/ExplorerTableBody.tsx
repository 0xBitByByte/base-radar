import { ProjectRow } from "@/components/explorer/ProjectRow";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ExplorerTableBodyProps = {
  projects: ProjectIntelligence[];
  onActivate?: (project: ProjectIntelligence) => void;
};

/** `<tbody>` — one `ProjectRow` per visible project. */
export function ExplorerTableBody({ projects, onActivate }: ExplorerTableBodyProps) {
  return (
    <tbody className="divide-y divide-radar-light-border dark:divide-white/10">
      {projects.map((project) => (
        <ProjectRow key={project.identity.id} project={project} onActivate={onActivate ? () => onActivate(project) : undefined} />
      ))}
    </tbody>
  );
}
