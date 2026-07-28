/**
 * PR-061 — the one directory-building pipeline (view → filter → search-or-
 * sort → paginate → title/subtitle/empty-state), extracted from
 * `app/dashboard/projects/page.tsx` so both that page (Full Directory) and
 * every new dedicated collection route (Task 2/7 — `/dashboard/projects/
 * verified`, `/blue-chips`, etc.) call the exact same computation instead of
 * two independently-maintained copies. `lockView` is the only new concept:
 * a dedicated route passes its own fixed view here, overriding whatever
 * (if anything) a tampered `?view=` query param claims — the URL segment
 * itself, not the query string, is that page's source of truth for which
 * collection it shows.
 */

import type { DirectoryEmptyState } from "@/components/projects/DirectoryEmptyState";
import {
  buildProjectsQuery,
  countActiveFilters,
  hasActiveFilters,
  parseProjectsQueryState,
  PROJECTS_PATH,
  VIEW_LABELS,
  type ProjectsQueryState,
  type ProjectsView,
  type RawSearchParams,
} from "@/components/projects/queryState";
import { PROJECTS_VIEW_META } from "@/components/projects/viewMeta";
import { filterLiveProjects } from "@/lib/projects/filter";
import { paginateLiveProjects } from "@/lib/projects/pagination";
import { buildProjectSearchIndex, searchLiveProjects } from "@/lib/projects/search";
import { sortLiveProjects } from "@/lib/projects/sort";
import type { FilterOptions, LiveProject, LiveProjectCollections, PaginatedResult } from "@/lib/projects/types";
import type { ProjectsLeaderboards, SmartViewLists } from "@/components/projects/loadProjectsData";

export const DIRECTORY_PAGE_SIZE = 24;

/** Picks the already-computed list backing a given view — never a new computation, just a lookup among lists `getLiveProjects()`/`buildCollections()`/`filterLiveProjects()`+`sortLiveProjects()` already produced. */
export function baseListForView(
  view: ProjectsView,
  projects: LiveProject[],
  collections: LiveProjectCollections,
  leaderboards: ProjectsLeaderboards,
  smartViewLists: SmartViewLists
): LiveProject[] {
  switch (view) {
    case "all":
      return projects;
    case "verified":
      return collections.verified;
    case "trending":
      return collections.trending;
    case "new":
      return collections.new;
    case "topTvl":
      return leaderboards.topTvl;
    case "topVolume":
      return leaderboards.topVolume;
    case "topActivity":
      return leaderboards.topActivity;
    case "needsReview":
      return collections.needsReview;
    case "recentlyDiscovered":
      return collections.recentlyDiscovered;
    case "recentlyUpdated":
      return collections.recentlyUpdated;
    case "blueChips":
      return smartViewLists.blueChips;
    case "emerging":
      return smartViewLists.emerging;
  }
}

/** One real sentence of "why these results" — never a generic label. Omitted entirely when browsing everything with nothing active. */
function buildDirectorySubtitle(state: ProjectsQueryState, isSearching: boolean): string | undefined {
  const parts: string[] = [];

  if (isSearching) {
    parts.push(`Results for "${state.search}"`);
  } else if (state.view !== "all" && PROJECTS_VIEW_META[state.view].description) {
    parts.push(PROJECTS_VIEW_META[state.view].description as string);
  }

  const filterCount = countActiveFilters(state);
  if (filterCount > 0) {
    parts.push(`${filterCount} filter${filterCount === 1 ? "" : "s"} applied`);
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

type DirectoryEmptyStateProps = Parameters<typeof DirectoryEmptyState>[0];

export type DirectoryPipelineResult = {
  state: ProjectsQueryState;
  directoryPage: PaginatedResult<LiveProject>;
  directoryTitle: string;
  directorySubtitle: string | undefined;
  emptyState: DirectoryEmptyStateProps;
};

export type BuildDirectoryPipelineInput = {
  rawSearchParams: RawSearchParams;
  projects: LiveProject[];
  collections: LiveProjectCollections;
  leaderboards: ProjectsLeaderboards;
  smartViewLists: SmartViewLists;
  /** A dedicated collection route's fixed view — always wins over whatever `?view=` claims. Omitted on the main Projects page, where `?view=` is itself the real, user-controlled state. */
  lockView?: Exclude<ProjectsView, "all">;
  pageSize?: number;
};

export function buildDirectoryPipeline({
  rawSearchParams,
  projects,
  collections,
  leaderboards,
  smartViewLists,
  lockView,
  pageSize = DIRECTORY_PAGE_SIZE,
}: BuildDirectoryPipelineInput): DirectoryPipelineResult {
  const parsed = parseProjectsQueryState(rawSearchParams);
  const state: ProjectsQueryState = lockView ? { ...parsed, view: lockView } : parsed;

  const base = baseListForView(state.view, projects, collections, leaderboards, smartViewLists);

  const filterOptions: FilterOptions = {
    category: state.categories.length > 0 ? state.categories : undefined,
    verified: state.verified ? true : undefined,
    hasVolume: state.hasVolume ? true : undefined,
    minConfidence: state.highConfidence ? 70 : undefined,
    discoveryStatus: state.discoveryStatuses.length > 0 ? state.discoveryStatuses : undefined,
    verificationStatus: state.verificationStatuses.length > 0 ? state.verificationStatuses : undefined,
  };
  const filtered = filterLiveProjects(base, filterOptions);

  const isSearching = state.search.length > 0;
  const ranked = isSearching
    ? searchLiveProjects(buildProjectSearchIndex(filtered), state.search).map((result) => result.project)
    : sortLiveProjects(filtered, state.sortField, state.sortOrder);

  const directoryPage = paginateLiveProjects(ranked, { page: state.page, pageSize });

  const directoryTitle = isSearching ? "Search Results" : VIEW_LABELS[state.view];
  const directorySubtitle = buildDirectorySubtitle(state, isSearching);

  const emptyState: DirectoryEmptyStateProps = isSearching
    ? { reason: "search", query: state.search, clearHref: `${PROJECTS_PATH}${buildProjectsQuery(state, { search: "" })}` }
    : hasActiveFilters(state)
      ? {
          reason: "filters",
          clearHref: `${PROJECTS_PATH}${buildProjectsQuery(state, {
            categories: [],
            verified: false,
            highConfidence: false,
            hasVolume: false,
            discoveryStatuses: [],
            verificationStatuses: [],
          })}`,
        }
      : state.view === "all"
        ? { reason: "collection", title: "No projects to show", description: "Once projects are tracked, they'll appear here." }
        : {
            reason: "collection",
            title: PROJECTS_VIEW_META[state.view].emptyTitle,
            description: PROJECTS_VIEW_META[state.view].emptyDescription,
          };

  return { state, directoryPage, directoryTitle, directorySubtitle, emptyState };
}
