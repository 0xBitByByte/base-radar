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
import { computeFinancialSummary, financialRangeDef } from "@/lib/projects/financial";
import { filterLiveProjects } from "@/lib/projects/filter";
import { paginateLiveProjects } from "@/lib/projects/pagination";
import { buildProjectSearchIndex, searchLiveProjects } from "@/lib/projects/search";
import { sortLiveProjects } from "@/lib/projects/sort";
import {
  FINANCIAL_METRICS,
  FINANCIAL_METRIC_LABELS,
  type FilterOptions,
  type FinancialMetric,
  type FinancialRangeId,
  type LiveProject,
  type LiveProjectCollections,
  type PaginatedResult,
} from "@/lib/projects/types";
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

/** The one active range per financial metric, read off `state` — the single place both the filter pipeline and the Financial Summary bar build this shape from. */
function activeFinancialRanges(state: ProjectsQueryState): Partial<Record<FinancialMetric, FinancialRangeId>> {
  const ranges: Partial<Record<FinancialMetric, FinancialRangeId>> = {};
  if (state.tvlRange) ranges.tvl = state.tvlRange;
  if (state.liquidityRange) ranges.liquidity = state.liquidityRange;
  if (state.marketCapRange) ranges.marketCap = state.marketCapRange;
  if (state.volumeRange) ranges.volume = state.volumeRange;
  return ranges;
}

/** Task 4 — one contextual stats card per active financial metric. */
export type FinancialSummaryEntry = {
  metric: FinancialMetric;
  rangeLabel: string;
  count: number;
  highest: number;
  average: number;
  total: number;
};

/**
 * Task 4 — computed only from `filtered` (the currently-visible set, after
 * every other active facet already narrowed it down) and only for metrics
 * with an active range — never the full registry, never a fabricated stat.
 */
function buildFinancialSummary(filtered: LiveProject[], ranges: Partial<Record<FinancialMetric, FinancialRangeId>>): FinancialSummaryEntry[] {
  return FINANCIAL_METRICS.flatMap((metric) => {
    const rangeId = ranges[metric];
    if (!rangeId) return [];
    const def = financialRangeDef(rangeId);
    const summary = computeFinancialSummary(filtered, metric);
    if (!def || !summary) return [];
    return [{ metric, rangeLabel: def.label, count: summary.count, highest: summary.highest, average: summary.average, total: summary.total }];
  });
}

/** Task 6 — a specific, real sentence when the active financial filter(s) are the reason nothing matched, e.g. "No verified projects currently match TVL > $100M." Falls back to the generic message when no financial range is active. */
function buildFiltersEmptyDescription(state: ProjectsQueryState, ranges: Partial<Record<FinancialMetric, FinancialRangeId>>): string {
  const activeMetrics = FINANCIAL_METRICS.filter((metric) => ranges[metric]);
  if (activeMetrics.length === 0) {
    return "Try removing a filter — the combination currently selected has no real matches.";
  }

  const financialPhrase = activeMetrics
    .map((metric) => {
      const def = financialRangeDef(ranges[metric] as FinancialRangeId);
      return `${FINANCIAL_METRIC_LABELS[metric]} ${def?.label ?? ""}`.trim();
    })
    .join(" and ");

  const subject = state.verified ? "verified projects" : "projects";
  return `No ${subject} currently match ${financialPhrase}.`;
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
  /** PR-063 — Task 4: one contextual stats card per active financial metric, computed from the filtered set. Empty when no financial filter is active. */
  financialSummary: FinancialSummaryEntry[];
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

  const financialRanges = activeFinancialRanges(state);
  const filterOptions: FilterOptions = {
    category: state.categories.length > 0 ? state.categories : undefined,
    verified: state.verified ? true : undefined,
    hasVolume: state.hasVolume ? true : undefined,
    confidenceLevel: state.confidenceLevel ?? undefined,
    discoveryStatus: state.discoveryStatuses.length > 0 ? state.discoveryStatuses : undefined,
    financialRanges: Object.keys(financialRanges).length > 0 ? financialRanges : undefined,
  };
  const filtered = filterLiveProjects(base, filterOptions);
  const financialSummary = buildFinancialSummary(filtered, financialRanges);

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
          description: buildFiltersEmptyDescription(state, financialRanges),
          browseAllHref: PROJECTS_PATH,
          clearHref: `${PROJECTS_PATH}${buildProjectsQuery(state, {
            categories: [],
            verified: false,
            confidenceLevel: null,
            hasVolume: false,
            discoveryStatuses: [],
            tvlRange: null,
            liquidityRange: null,
            marketCapRange: null,
            volumeRange: null,
          })}`,
        }
      : state.view === "all"
        ? { reason: "collection", title: "No projects to show", description: "Once projects are tracked, they'll appear here." }
        : {
            reason: "collection",
            title: PROJECTS_VIEW_META[state.view].emptyTitle,
            description: PROJECTS_VIEW_META[state.view].emptyDescription,
          };

  return { state, directoryPage, directoryTitle, directorySubtitle, emptyState, financialSummary };
}
