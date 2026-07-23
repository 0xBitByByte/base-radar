"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ExplorerHeader } from "@/components/explorer/ExplorerHeader";
import { ExplorerSearch } from "@/components/explorer/ExplorerSearch";
import { ExplorerSort } from "@/components/explorer/ExplorerSort";
import { ExplorerFilterBar } from "@/components/explorer/ExplorerFilterBar";
import { ExplorerGrid } from "@/components/explorer/ExplorerGrid";
import { ExplorerTable } from "@/components/explorer/ExplorerTable";
import { ViewToggle, type ExplorerView } from "@/components/explorer/ViewToggle";
import { normalizeSearch, searchProjects } from "@/components/explorer/search";
import { sortProjects, DEFAULT_SORT, type SortState } from "@/components/explorer/sort";
import { EMPTY_FILTERS, filterProjects, hasActiveFilters, type ExplorerFilters } from "@/components/explorer/filters";
import { useWatchlists } from "@/lib/hooks/useWatchlists";
import type { ProjectIntelligence } from "@/lib/intelligence/types";
import type { RegistryMetrics } from "@/data/projects/metrics";

type ExplorerPageClientProps = {
  /** Already resolved by `ExplorerPage` via `getAllProjectIntelligence()` — never fetched here. */
  projects: ProjectIntelligence[];
  generatedAt: string;
  /** PR-038 — real, computed registry counts (`computeRegistryMetrics(PROJECTS)`), never fetched or derived here. */
  registryMetrics: RegistryMetrics;
};

/**
 * Owns every piece of Explorer's PR1–PR3 UI state (search query, filters,
 * filter-bar expand/collapse, sort) — the one client boundary in this
 * feature. Receives already-fetched `ProjectIntelligence[]` as props; never
 * imports from `lib/intelligence/` or `lib/providers/` itself, per
 * docs/explorer/05 §18's anti-patterns.
 */
export function ExplorerPageClient({ projects, generatedAt, registryMetrics }: ExplorerPageClientProps) {
  const router = useRouter();
  const { activeWatchlist } = useWatchlists();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [filters, setFilters] = useState<ExplorerFilters>(EMPTY_FILTERS);
  const [filterBarExpanded, setFilterBarExpanded] = useState(false);
  const [view, setView] = useState<ExplorerView>("grid");

  const hasQuery = normalizeSearch(query).length > 0;
  const filtersActive = hasActiveFilters(filters);

  // PR-011: only ever breaks a tie between two projects the active sort
  // field already ranks identically — never overrides a real TVL/health/
  // confidence difference. `undefined` (no active watchlist) leaves
  // `sortProjects` byte-for-byte unchanged, same as PR-010's Global Search.
  const prioritizedProjectIds = useMemo(
    () => (activeWatchlist ? new Set(activeWatchlist.projectIds) : undefined),
    [activeWatchlist]
  );

  const visibleProjects = useMemo(() => {
    // Pipeline: All Projects -> Search -> Filters -> Sort -> Render.
    const searched = searchProjects(projects, query);
    const filtered = filterProjects(searched, filters);
    // An active query keeps Search's own relevance order (docs/explorer/02 §5);
    // Sort governs order only once no query is narrowing the list — otherwise
    // Sort would silently discard the relevance ranking Search just computed,
    // exactly as established in PR2.
    return hasQuery ? filtered : sortProjects(filtered, sort, prioritizedProjectIds);
  }, [projects, query, filters, sort, hasQuery, prioritizedProjectIds]);

  function clearSearch() {
    setQuery("");
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function openProfile(project: ProjectIntelligence) {
    router.push(`/dashboard/projects/${project.identity.slug}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <ExplorerHeader
        visibleCount={visibleProjects.length}
        generatedAt={generatedAt}
        registryMetrics={registryMetrics}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <ExplorerSearch value={query} onChange={setQuery} className="sm:flex-1" />
          <ExplorerSort value={sort} onChange={setSort} />
          <ViewToggle value={view} onChange={setView} />
        </div>

        <ExplorerFilterBar
          projects={projects}
          filters={filters}
          onFiltersChange={setFilters}
          expanded={filterBarExpanded}
          onToggleExpanded={() => setFilterBarExpanded((prev) => !prev)}
          onClearFilters={clearFilters}
          resultCount={visibleProjects.length}
        />
      </div>

      {view === "grid" ? (
        <ExplorerGrid
          projects={visibleProjects}
          hasQuery={hasQuery}
          hasFilters={filtersActive}
          onClearSearch={clearSearch}
          onClearFilters={clearFilters}
          onActivate={openProfile}
          filters={filters}
        />
      ) : (
        <ExplorerTable
          projects={visibleProjects}
          hasQuery={hasQuery}
          hasFilters={filtersActive}
          onClearSearch={clearSearch}
          onClearFilters={clearFilters}
          sort={sort}
          onSortChange={setSort}
          onActivate={openProfile}
          filters={filters}
        />
      )}
    </div>
  );
}
