"use client";

/**
 * Filters an already-fetched `ProjectIntelligence[]` down to the projects
 * currently on the watchlist — shared by the Dashboard's `WatchlistWidget`
 * and the Watchlist page so neither hand-rolls its own filter against
 * `useWatchlist()`. Never fetches anything: `allProjects` is always the
 * same `getAllProjectIntelligence()` result its caller already fetched
 * server-side, once.
 */

import { useMemo } from "react";

import { useWatchlist } from "@/lib/hooks/useWatchlist";
import type { ProjectIntelligence } from "@/lib/intelligence/types";

export function useWatchedProjects(allProjects: ProjectIntelligence[]): ProjectIntelligence[] {
  const { projectIds } = useWatchlist();

  return useMemo(() => {
    const watchedIds = new Set(projectIds);
    return allProjects.filter((project) => watchedIds.has(project.identity.id));
  }, [allProjects, projectIds]);
}
