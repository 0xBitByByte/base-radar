"use client";

import { useMemo } from "react";

import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { buildDirectoryPipelineFromState } from "@/components/projects/collectionPipeline";
import { computeProjectsPageData } from "@/components/projects/loadProjectsData";
import { ProjectsCollectionHeader, ProjectsCollectionPage } from "@/components/projects/ProjectsCollectionPage";
import { useProjectsQueryState } from "@/lib/hooks/useProjectsQueryState";
import type { LiveProject } from "@/lib/projects/types";

const VIEW = "all" as const;

/**
 * Vercel production-hotspot follow-up — the client-side-filtering
 * replacement for `/dashboard/projects/all`'s previous server render (via
 * the shared `renderProjectsCollectionRoute()`, still used unchanged by
 * the 11 other collection routes). `projects` is the full, public
 * `LiveProject[]` array, fetched once server-side (see
 * `app/dashboard/projects/all/page.tsx`) and shipped as a plain prop —
 * every filter/sort/search/pagination interaction below is now a pure,
 * synchronous, client-only computation over that already-shipped array
 * (`computeProjectsPageData`/`buildDirectoryPipelineFromState`, the exact
 * same pure functions the server used before, just called from the
 * browser), with zero further network requests. `useProjectsQueryState()`
 * owns reading/writing the URL (`history.pushState`, `popstate` for back/
 * forward) — see its own doc comment.
 */
export function ProjectsAllClient({ projects }: { projects: LiveProject[] }) {
  const { state: parsedState, navigate } = useProjectsQueryState();

  // Recomputed only when `projects` changes (never, after the initial
  // server-provided array — this page has no client-side refetch), so this
  // is effectively a one-time computation, not a per-keystroke cost.
  const data = useMemo(() => computeProjectsPageData(projects), [projects]);

  // Requirement #10 — memoized on `[parsedState, data]`: recomputes only
  // when the URL-derived query state or the (effectively static) dataset
  // actually changes, not on every render this component's parent tree
  // causes for unrelated reasons. Computed unconditionally (before the
  // empty-state early return below) — every Hook in this component must
  // run in the same order on every render, regardless of `data`'s length.
  const pipeline = useMemo(
    () =>
      buildDirectoryPipelineFromState({
        parsedState,
        projects: data.projects,
        collections: data.collections,
        leaderboards: data.leaderboards,
        smartViewLists: data.smartViewLists,
      }),
    [parsedState, data]
  );

  if (data.projects.length === 0) {
    return (
      <div className="flex flex-col gap-10 pb-10">
        <ProjectsCollectionHeader view={VIEW} />
        <ExplorerEmptyState />
      </div>
    );
  }

  const { state, directoryPage, directoryTitle, directorySubtitle, emptyState, financialSummary } = pipeline;

  return (
    <div className="flex flex-col gap-10 pb-10">
      <ProjectsCollectionHeader view={VIEW} />
      <ProjectsCollectionPage
        view={VIEW}
        state={state}
        directoryPage={directoryPage}
        directoryTitle={directoryTitle}
        directorySubtitle={directorySubtitle}
        emptyState={emptyState}
        financialSummary={financialSummary}
        allProjects={data.projects}
        onNavigate={navigate}
      />
    </div>
  );
}
