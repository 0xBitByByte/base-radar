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

import { cache } from "react";

import { buildCollections, isHighConfidence, isNeedsReview, isNew, isRecentlyDiscovered, isRecentlyUpdated, isVerified } from "@/lib/projects/collections";
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
  /** PR-074 REVIEW #2 — fallback rankings for the "Top Activity" ("Most Starred") route when GitHub is unavailable and that leaderboard has zero qualifying projects. Always computed (cheap, no extra fetch — same fields the Full Directory's own sort already reads), not only when needed. */
  topMarketCap: LiveProject[];
  topMovers: LiveProject[];
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
 *
 * PR-085.02B — this function itself is now also `cache()`-wrapped. The
 * Projects page splits into three independently-streamed Suspense
 * boundaries, each calling this function; without memoizing here too, the
 * ~22-pass `buildCollections()`/leaderboard/smart-view derivation (already
 * flagged as a real cost in the Performance Audit) would run three times
 * per request instead of once. No logic inside this function changed.
 */
export const loadProjectsPageData = cache(async (): Promise<ProjectsPageData> => {
  const projects = await getLiveProjects();
  const collections = buildCollections(projects);

  const leaderboards: ProjectsLeaderboards = {
    topTvl: sortLiveProjects(filterLiveProjects(projects, { hasTvl: true }), "tvl", "desc"),
    topVolume: sortLiveProjects(filterLiveProjects(projects, { hasVolume: true }), "volume", "desc"),
    // PR-074 — was sorted by "activity" (`engineering.commitsLast7d`), a
    // field this list-wide computation never populates for any project
    // (commit history is only ever fetched for the single Project Profile
    // page's extended path) — confirmed live: this leaderboard was
    // structurally empty for the entire ~1,000-project catalog, not a
    // filtering bug. Re-ranked by real GitHub stars instead — see
    // `viewMeta.ts`'s `topActivity` entry for the full explanation.
    topActivity: sortLiveProjects(filterLiveProjects(projects, { hasGithub: true }), "stars", "desc"),
    topMarketCap: sortLiveProjects(filterLiveProjects(projects, { hasMarketCap: true }), "marketCap", "desc"),
    topMovers: sortLiveProjects(filterLiveProjects(projects, { hasChangePct24h: true }), "movers", "desc"),
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
});

/** PR-085.02C — everything the Hero section (Header + Base Today + Executive Summary) actually reads: counts and single "highest" projects, never the full ranked collections/leaderboards Discovery's rails need. */
export type ProjectsHeroSnapshot = {
  totalProjects: number;
  /** Most recent `LiveProject.lastUpdated` across the whole set — same rule `page.tsx`'s own `mostRecentTimestamp` used, now folded into this snapshot's single traversal instead of a second, separate loop. */
  lastUpdated: string | null;
  totalTvlUsd: number;
  hasAnyTvl: boolean;
  activeProposalCount: number;
  governanceConfiguredCount: number;
  newCount: number;
  recentlyDiscoveredCount: number;
  recentlyUpdatedCount: number;
  needsReviewCount: number;
  verifiedCount: number;
  highConfidenceCount: number;
  smartViewCounts: Record<SmartViewId, number>;
  highestTvl: LiveProject | undefined;
  highestVolume: LiveProject | undefined;
  highestActivity: LiveProject | undefined;
};

/**
 * PR-085.02C — a lightweight, single-traversal projection over `projects`
 * for the Hero section only. Deliberately NOT `loadProjectsPageData()`:
 * that function computes 17 separate passes' worth of fully ranked,
 * sorted collections and leaderboards Hero never displays — it only ever
 * needs counts and the single highest project per leaderboard, never the
 * full ranked lists Discovery's rails show. Every count/max below reuses
 * the exact same predicate functions `buildCollections()` itself uses
 * (`lib/projects/collections.ts`) — imported, not redefined — so "what
 * counts as new/verified/needs-review" is defined in exactly one place
 * regardless of which of the two projections asks the question, the same
 * precedent `isVerified`'s own original export already established.
 * `getLiveProjects()` remains the one real fetch, already `cache()`-
 * wrapped; this function adds no new provider request, only a second,
 * much cheaper way of reading its already-resolved result — and is itself
 * `cache()`-wrapped so multiple Hero-adjacent consumers within the same
 * request share one traversal, not one each.
 */
export const getProjectsHeroSnapshot = cache(async (): Promise<ProjectsHeroSnapshot> => {
  const projects = await getLiveProjects();

  let lastUpdatedMs = -Infinity;
  let lastUpdated: string | null = null;
  let totalTvlUsd = 0;
  let hasAnyTvl = false;
  let activeProposalCount = 0;
  let governanceConfiguredCount = 0;
  let newCount = 0;
  let recentlyDiscoveredCount = 0;
  let recentlyUpdatedCount = 0;
  let needsReviewCount = 0;
  let verifiedCount = 0;
  let highConfidenceCount = 0;
  let blueChipsCount = 0;
  let emergingCount = 0;
  let fastGrowingCount = 0;
  let highestTvl: LiveProject | undefined;
  let highestVolume: LiveProject | undefined;
  let highestActivity: LiveProject | undefined;

  // MANDATORY REFINEMENT #2 — one traversal, every accumulator updated
  // together per project, never a separate `.filter()`/`.reduce()` pass
  // per fact the way `buildCollections()`/`loadProjectsPageData()` do.
  for (const project of projects) {
    const updatedMs = Date.parse(project.lastUpdated);
    if (!Number.isNaN(updatedMs) && updatedMs > lastUpdatedMs) {
      lastUpdatedMs = updatedMs;
      lastUpdated = project.lastUpdated;
    }

    totalTvlUsd += project.market.tvlUsd ?? 0;
    if (project.market.tvlUsd !== null) hasAnyTvl = true;
    activeProposalCount += project.governance.activeProposalCount ?? 0;
    if (project.governance.configured) governanceConfiguredCount++;

    const verified = isVerified(project);
    const recentlyDiscovered = isRecentlyDiscovered(project);

    if (isNew(project)) newCount++;
    if (recentlyDiscovered) recentlyDiscoveredCount++;
    if (isRecentlyUpdated(project)) recentlyUpdatedCount++;
    if (isNeedsReview(project)) needsReviewCount++;
    if (verified) verifiedCount++;
    if (isHighConfidence(project)) highConfidenceCount++;
    if (project.engineering.available) fastGrowingCount++;

    // Same rule as `loadProjectsPageData()`'s `smartViewLists.blueChips`/`emerging` — see that block's own comments for the source of these two conditions.
    if (verified && project.market.tvlUsd !== null && project.market.tvlUsd > BLUE_CHIP_MIN_TVL_USD) blueChipsCount++;
    if (recentlyDiscovered && project.confidence.score >= HIGH_CONFIDENCE_MIN_SCORE) emergingCount++;

    // "Highest" per leaderboard — the single max, mirroring `sortLiveProjects(..., "desc")[0]`'s own nulls-last semantics (`lib/projects/sort.ts`) without running a full sort for a value only its first element is ever read from.
    if (project.market.tvlUsd !== null && (highestTvl === undefined || project.market.tvlUsd > (highestTvl.market.tvlUsd as number))) {
      highestTvl = project;
    }
    if (
      project.market.volume24hUsd !== null &&
      (highestVolume === undefined || project.market.volume24hUsd > (highestVolume.market.volume24hUsd as number))
    ) {
      highestVolume = project;
    }
    if (
      project.engineering.available &&
      project.engineering.stars !== null &&
      (highestActivity === undefined || project.engineering.stars > (highestActivity.engineering.stars as number))
    ) {
      highestActivity = project;
    }
  }

  return {
    totalProjects: projects.length,
    lastUpdated,
    totalTvlUsd,
    hasAnyTvl,
    activeProposalCount,
    governanceConfiguredCount,
    newCount,
    recentlyDiscoveredCount,
    recentlyUpdatedCount,
    needsReviewCount,
    verifiedCount,
    highConfidenceCount,
    smartViewCounts: { blueChips: blueChipsCount, emerging: emergingCount, needsAttention: needsReviewCount, fastGrowing: fastGrowingCount },
    highestTvl,
    highestVolume,
    highestActivity,
  };
});
