"use client";

import { useEffect, useRef, useState } from "react";

import { ExplorerTableHeader } from "@/components/explorer/ExplorerTableHeader";
import { ExplorerTableBody } from "@/components/explorer/ExplorerTableBody";
import { NoResultsState } from "@/components/explorer/NoResultsState";
import type { SortState } from "@/components/explorer/sort";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

type ExplorerTableProps = {
  projects: ProjectIntelligence[];
  hasQuery: boolean;
  hasFilters: boolean;
  onClearSearch: () => void;
  onClearFilters: () => void;
  sort: SortState;
  onSortChange: (next: SortState) => void;
};

/**
 * Explorer's Results Area in Table View (docs/explorer/03 §9) — the dense
 * comparison surface. Mirrors `ExplorerGrid`'s shape (results container +
 * `NoResultsState` fallback), consuming the exact same `visibleProjects`
 * array the pipeline already produces for Grid.
 */
export function ExplorerTable({
  projects,
  hasQuery,
  hasFilters,
  onClearSearch,
  onClearFilters,
  sort,
  onSortChange,
}: ExplorerTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  // A 1px sentinel just above the table, observed against this table's own
  // scroll container: once it scrolls out of view, the sticky header has
  // "landed" — the trigger for its subtle scroll shadow.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), { root });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (projects.length === 0) {
    return (
      <NoResultsState
        hasQuery={hasQuery}
        hasFilters={hasFilters}
        onClearSearch={onClearSearch}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    // Bounded height so the table (not the page) is what scrolls vertically
    // — the only way `<thead>`'s `sticky top-0` has a real scroll container
    // to stick against (see `ExplorerTableHeader`). The bound itself isn't
    // an arbitrary number: `4rem` is exactly `Topbar`'s own declared `h-16`
    // sticky height (components/dashboard/Topbar.tsx) — the one truly fixed
    // piece of chrome in this layout — so the table claims every viewport
    // pixel below it rather than an arbitrary fraction like the old 70vh.
    // `dvh` (not `vh`) matches `DashboardLayout`'s own `min-h-dvh` convention.
    <div
      ref={scrollRef}
      className="max-h-[calc(100dvh-4rem)] overflow-auto rounded-2xl border border-radar-light-border dark:border-white/10"
    >
      <div ref={sentinelRef} aria-hidden="true" />
      <table aria-label="Projects" className="w-full border-collapse">
        <ExplorerTableHeader sort={sort} onSortChange={onSortChange} isStuck={isStuck} />
        <ExplorerTableBody projects={projects} />
      </table>
    </div>
  );
}
