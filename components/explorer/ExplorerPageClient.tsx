"use client";

import { useMemo, useState } from "react";

import { ExplorerHeader } from "@/components/explorer/ExplorerHeader";
import { ExplorerSearch } from "@/components/explorer/ExplorerSearch";
import { ExplorerSort } from "@/components/explorer/ExplorerSort";
import { ExplorerIdentityList } from "@/components/explorer/ExplorerIdentityList";
import { normalizeSearch, searchProjects } from "@/components/explorer/search";
import { sortProjects, DEFAULT_SORT, type SortState } from "@/components/explorer/sort";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ExplorerPageClientProps = {
  /** Already resolved by `ExplorerPage` via `getAllProjectIntelligence()` — never fetched here. */
  projects: ProjectIntelligence[];
  generatedAt: string;
};

/**
 * Owns Explorer's PR1 UI state (search query, sort) — the one client
 * boundary in this feature. Receives already-fetched `ProjectIntelligence[]`
 * as props; never imports from `lib/intelligence/` or `lib/providers/`
 * itself, per docs/explorer/05 §18's anti-patterns.
 */
export function ExplorerPageClient({ projects, generatedAt }: ExplorerPageClientProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const visibleProjects = useMemo(() => {
    const matched = searchProjects(projects, query);
    // An active query orders by search relevance (name/tag/category/description
    // rank, per docs/explorer/02 §5); with no query, the explicit Sort control
    // governs order, exactly as before search ranking existed.
    const hasQuery = normalizeSearch(query).length > 0;
    return hasQuery ? matched : sortProjects(matched, sort);
  }, [projects, query, sort]);

  return (
    <div className="flex flex-col gap-6">
      <ExplorerHeader visibleCount={visibleProjects.length} generatedAt={generatedAt} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <ExplorerSearch value={query} onChange={setQuery} className="sm:flex-1" />
        <ExplorerSort value={sort} onChange={setSort} />
      </div>

      <ExplorerIdentityList projects={visibleProjects} onClearSearch={() => setQuery("")} />
    </div>
  );
}
