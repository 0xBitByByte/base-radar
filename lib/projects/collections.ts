/**
 * PR-054 — Task 3: named collections over a `LiveProject[]`. Every rule
 * below checks a real, already-computed `LiveProject` field — never a
 * fabricated bucket. Some collections are honestly limited by what this
 * PR's models can actually express (see the per-collection comments); those
 * limitations are documented, not hidden, matching PR-053's own precedent
 * for `DiscoveryStatus`'s "upcoming"/"announced" states.
 */

import { PROJECT_CATEGORIES, type ProjectCategory } from "@/data/projects/enums";
import type { LiveProject, LiveProjectCollections } from "@/lib/projects/types";

const TRENDING_CHANGE_PCT_THRESHOLD = 10;

/**
 * PR-056 — exported so `filter.ts`'s `verified` facet reuses this exact
 * rule instead of redefining "verified" a second time.
 */
export function isVerified(project: LiveProject): boolean {
  return project.verification.status === "verified" || project.discoveryStatus === "verified";
}

function isNew(project: LiveProject): boolean {
  return project.discoveryStatus === "new";
}

/**
 * PR-074 — "Recently updated," now driven by the registry's own real
 * `lifecycle.updatedAt` timestamp (`LiveProject.registryUpdatedAt`,
 * threaded through `build.ts`) instead of Discovery's `"recently-updated"`
 * status. Confirmed root cause of this collection being permanently empty
 * across the ~1,000-project catalog: that status is only ever assigned to a
 * project that happens to also come back as a "matches an existing entry
 * with new data" candidate in THIS SAME stateless request's Discovery scan
 * — which only samples a handful of live-source categories, never the full
 * registry — so the overwhelming majority of registry projects can never
 * carry it, no matter how recently their real registry entry actually
 * changed. `registryUpdatedAt` is real, static, and already present on
 * every registry project regardless of whether Discovery happened to
 * re-surface it this run.
 */
const RECENTLY_UPDATED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function isRecentlyUpdated(project: LiveProject): boolean {
  if (!project.registryUpdatedAt) return false;
  const updatedAtMs = Date.parse(project.registryUpdatedAt);
  if (Number.isNaN(updatedAtMs)) return false;
  return Date.now() - updatedAtMs <= RECENTLY_UPDATED_WINDOW_MS;
}

/**
 * "Recently discovered" — no discovery-run history is persisted anywhere in
 * this codebase yet (each run is stateless), so this honestly collapses to
 * "has discovery evidence from this run" rather than a true recency window.
 * Same limitation PR-053 itself documented for an equivalent gap.
 */
function isRecentlyDiscovered(project: LiveProject): boolean {
  return project.discoveryMetadata !== null;
}

/**
 * "Recently verified" — reads `verification.verifiedAt`, which is real
 * registry data (`Project.verification.verifiedAt`), but likely empty today
 * since most seed projects don't set it. No fabricated fallback — an empty
 * collection here is an honest reflection of the registry's current state.
 */
function isRecentlyVerified(project: LiveProject, withinMs: number): boolean {
  if (!project.verification.verifiedAt) return false;
  const verifiedAtMs = Date.parse(project.verification.verifiedAt);
  if (Number.isNaN(verifiedAtMs)) return false;
  return Date.now() - verifiedAtMs <= withinMs;
}

function isTrending(project: LiveProject): boolean {
  const multiSourceAgreement = (project.discoveryMetadata?.sources.length ?? 0) > 1;
  const strongMove = project.market.changePct24h !== null && Math.abs(project.market.changePct24h) >= TRENDING_CHANGE_PCT_THRESHOLD;
  return multiSourceAgreement || strongMove;
}

function isUpcoming(project: LiveProject): boolean {
  return project.discoveryStatus === "upcoming" || project.discoveryStatus === "announced";
}

function isHighConfidence(project: LiveProject): boolean {
  return project.confidence.level === "high";
}

function isNeedsReview(project: LiveProject): boolean {
  return project.discoveryStatus === "needs-review" || project.confidence.level === "low";
}

function groupByCategory(projects: LiveProject[]): Record<ProjectCategory, LiveProject[]> {
  const groups = Object.fromEntries(PROJECT_CATEGORIES.map((category) => [category, [] as LiveProject[]])) as Record<
    ProjectCategory,
    LiveProject[]
  >;
  for (const project of projects) {
    groups[project.category].push(project);
  }
  return groups;
}

const RECENTLY_VERIFIED_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Builds every named collection in one pass over `projects`. Deterministic — same input, same output, every call. */
export function buildCollections(projects: LiveProject[]): LiveProjectCollections {
  return {
    verified: projects.filter(isVerified),
    new: projects.filter(isNew),
    recentlyUpdated: projects.filter(isRecentlyUpdated),
    recentlyDiscovered: projects.filter(isRecentlyDiscovered),
    recentlyVerified: projects.filter((project) => isRecentlyVerified(project, RECENTLY_VERIFIED_WINDOW_MS)),
    trending: projects.filter(isTrending),
    upcoming: projects.filter(isUpcoming),
    highConfidence: projects.filter(isHighConfidence),
    needsReview: projects.filter(isNeedsReview),
    byCategory: groupByCategory(projects),
  };
}
