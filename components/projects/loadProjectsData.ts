/**
 * PR-061 — the one place `getLiveProjects()` is called and every derived,
 * page-wide list (`collections`, `leaderboards`, the two Smart-View-only
 * lists, and their counts) is computed. Previously this composition lived
 * inline in `app/dashboard/projects/page.tsx`; pulled out so the 11 new
 * dedicated collection routes (Task 2/7) and the "Base Today" panel
 * (Task 1) can all read the exact same computation instead of each
 * re-deriving it. Still zero new business logic — every call below is the
 * same `buildCollections`/`filterLiveProjects`/`sortLiveProjects` from
 * `lib/projects/` that PR-058/059/060 already used.
 */

import { buildCollections } from "@/lib/projects/collections";
import { filterLiveProjects } from "@/lib/projects/filter";
import { getLiveProjects } from "@/lib/projects/service";
import { sortLiveProjects } from "@/lib/projects/sort";
import type { LiveProject, LiveProjectCollections } from "@/lib/projects/types";
import type { SmartViewId } from "@/components/projects/smartViewDefinitions";

/** Real, already-published TVL threshold for the "Blue Chips" Smart View — not configurable, matching the brief's own fixed $100M bar. */
export const BLUE_CHIP_MIN_TVL_USD = 100_000_000;
/** Same threshold the Filter Bar's "High Confidence" quick filter uses (`FilterOptions.minConfidence`) — one shared constant so "Emerging" can't drift from it. */
export const HIGH_CONFIDENCE_MIN_SCORE = 70;

export type ProjectsLeaderboards = {
  topTvl: LiveProject[];
  topVolume: LiveProject[];
  topActivity: LiveProject[];
};

export type SmartViewLists = {
  blueChips: LiveProject[];
  emerging: LiveProject[];
};

export type ProjectsPageData = {
  projects: LiveProject[];
  collections: LiveProjectCollections;
  leaderboards: ProjectsLeaderboards;
  smartViewLists: SmartViewLists;
  smartViewCounts: Record<SmartViewId, number>;
};

/**
 * One request-scoped fetch + derivation pass. `getLiveProjects()` is itself
 * `cache()`-wrapped (`lib/projects/service.ts`), so calling this from
 * multiple pages/components within the same request is free — it's the
 * same guarantee `page.tsx` already relied on before this extraction.
 */
export async function loadProjectsPageData(): Promise<ProjectsPageData> {
  const projects = await getLiveProjects();
  const collections = buildCollections(projects);

  const leaderboards: ProjectsLeaderboards = {
    topTvl: sortLiveProjects(filterLiveProjects(projects, { hasTvl: true }), "tvl", "desc"),
    topVolume: sortLiveProjects(filterLiveProjects(projects, { hasVolume: true }), "volume", "desc"),
    topActivity: sortLiveProjects(filterLiveProjects(projects, { hasGithub: true }), "activity", "desc"),
  };

  const smartViewLists: SmartViewLists = {
    blueChips: sortLiveProjects(
      filterLiveProjects(projects, { verified: true, hasTvl: true }).filter(
        (project) => (project.market.tvlUsd ?? 0) > BLUE_CHIP_MIN_TVL_USD
      ),
      "tvl",
      "desc"
    ),
    emerging: sortLiveProjects(
      filterLiveProjects(collections.recentlyDiscovered, { minConfidence: HIGH_CONFIDENCE_MIN_SCORE }),
      "discoveryDate",
      "desc"
    ),
  };

  const smartViewCounts: Record<SmartViewId, number> = {
    blueChips: smartViewLists.blueChips.length,
    emerging: smartViewLists.emerging.length,
    needsAttention: collections.needsReview.length,
    fastGrowing: leaderboards.topActivity.length,
  };

  return { projects, collections, leaderboards, smartViewLists, smartViewCounts };
}
