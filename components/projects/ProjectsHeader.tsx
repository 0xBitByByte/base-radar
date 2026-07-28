/** PR-057 — Task 3: the new Projects page header. Title, description, real project count, and a last-updated indicator derived from the already-fetched `LiveProject[]` — no action that doesn't exist yet (no "Add Project," no export button). */

import { Timestamp } from "@/components/explorer/Timestamp";
import { formatNumber } from "@/lib/data/format";

type ProjectsHeaderProps = {
  totalCount: number;
  /** Most recent `LiveProject.lastUpdated` across the whole set — `null` only if there are zero projects, which never reaches this component (the page renders an empty state first). */
  lastUpdated: string | null;
};

export function ProjectsHeader({ totalCount, lastUpdated }: ProjectsHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-radar-light-text dark:text-radar-white">Projects</h1>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-radar-light-muted dark:text-radar-muted">
        <span>Browse the Base ecosystem</span>
        <span aria-hidden="true">·</span>
        <span>
          {formatNumber(totalCount)} project{totalCount === 1 ? "" : "s"} tracked
        </span>
        {lastUpdated && (
          <>
            <span aria-hidden="true">·</span>
            <Timestamp iso={lastUpdated} />
          </>
        )}
      </p>
    </div>
  );
}
