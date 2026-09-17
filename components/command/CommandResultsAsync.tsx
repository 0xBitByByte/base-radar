"use client";

import { use, useMemo } from "react";

import { CommandResults } from "@/components/command/CommandResults";
import type { SearchableItem } from "@/lib/search/types";
import type { LiveProject } from "@/lib/projects/types";

type CommandResultsAsyncProps = {
  liveProjectsPromise: Promise<LiveProject[]>;
  results: SearchableItem[];
  activeItemId: string | null;
  onSelect: (item: SearchableItem) => void;
  onHover: (itemId: string) => void;
};

/**
 * Universal Project Card, PR-8 — unwraps `liveProjectsPromise` (from
 * `app/dashboard/layout.tsx`, threaded through `DashboardLayout`/`Topbar`)
 * without ever awaiting it itself, same pattern as `LiveStatusBarAsync`:
 * `use()` suspends only this one component if the promise isn't settled
 * yet, so the palette's trigger button and input never wait on it — only
 * this results list does, behind its own `<Suspense>` boundary in
 * `CommandPalette`. No fetch happens here — the promise was already
 * started at navigation time by the layout.
 */
export function CommandResultsAsync({ liveProjectsPromise, results, activeItemId, onSelect, onHover }: CommandResultsAsyncProps) {
  const liveProjects = use(liveProjectsPromise);
  const liveProjectById = useMemo(() => new Map(liveProjects.map((project) => [project.id, project])), [liveProjects]);

  return (
    <CommandResults
      results={results}
      activeItemId={activeItemId}
      onSelect={onSelect}
      onHover={onHover}
      liveProjectById={liveProjectById}
    />
  );
}
