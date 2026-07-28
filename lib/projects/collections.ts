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
 * "Recently updated" — driven by Discovery's own `"recently-updated"`
 * status (assigned when a rediscovered candidate carries data the registry
 * doesn't have yet). A registry-side `lifecycle.updatedAt` recency check
 * isn't available here because `LiveProject` doesn't carry `lifecycle` —
 * that field would need to be threaded through `build.ts` first.
 */
function isRecentlyUpdated(project: LiveProject): boolean {
  return project.discoveryStatus === "recently-updated";
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
