/**
 * PR-061 — Task 2 & 7: the one function every dedicated collection route
 * (`app/dashboard/projects/verified/page.tsx`, `/blue-chips/page.tsx`, etc.)
 * calls. Each of those 11 route files is intentionally a few-line wrapper —
 * Next's App Router requires one real `page.tsx` per URL, but the actual
 * data-fetch + pipeline + render logic lives here exactly once, so there are
 * 11 route *entries*, never 11 copies of the same logic.
 */

import { ExplorerEmptyState } from "@/components/explorer/ExplorerEmptyState";
import { ExplorerErrorState } from "@/components/explorer/ExplorerErrorState";
import { buildDirectoryPipeline } from "@/components/projects/collectionPipeline";
import { loadProjectsPageData } from "@/components/projects/loadProjectsData";
import { ProjectsCollectionPage } from "@/components/projects/ProjectsCollectionPage";
import type { ProjectsView, RawSearchParams } from "@/components/projects/queryState";

export async function renderProjectsCollectionRoute(
  view: Exclude<ProjectsView, "all">,
  rawSearchParams: RawSearchParams
) {
  let data;
  try {
    data = await loadProjectsPageData();
  } catch {
    return <ExplorerErrorState />;
  }

  if (data.projects.length === 0) {
    return <ExplorerEmptyState />;
  }

  const { state, directoryPage, directoryTitle, directorySubtitle, emptyState, financialSummary } = buildDirectoryPipeline({
    rawSearchParams,
    projects: data.projects,
    collections: data.collections,
    leaderboards: data.leaderboards,
    smartViewLists: data.smartViewLists,
    lockView: view,
  });

  return (
    <ProjectsCollectionPage
      view={view}
      state={state}
      directoryPage={directoryPage}
      directoryTitle={directoryTitle}
      directorySubtitle={directorySubtitle}
      emptyState={emptyState}
      financialSummary={financialSummary}
      allProjects={data.projects}
    />
  );
}
