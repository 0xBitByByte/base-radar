/** Public API for the GitHub provider — cache- and rate-limit-guarded. */

import { fetchCommitActivity, fetchContributors, fetchLatestRelease, fetchReleases, fetchRepo, type RawRelease } from "@/lib/providers/github/client";
import {
  mapCommitActivity,
  mapContributorCount,
  mapReleases,
  mapRepoStats,
  type CommitActivity,
  type ContributorCount,
  type ReleaseSummary,
  type RepoStats,
} from "@/lib/providers/github/mapper";
import { getOrSet, getStale } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";
import { getGithubRateLimitSnapshot, type GithubRateLimitSnapshot } from "@/lib/providers/github/rateLimit";

const PROVIDER = "github" as const;
const CACHE_TTL_MS = 600_000; // matches the window documented in docs/API.md
/**
 * PR-074 REVIEW #1 — this budget must track `GITHUB_TOKEN`, not just
 * GitHub's own real ceiling: a `GITHUB_TOKEN` genuinely raises GitHub's own
 * limit from 60 to 5,000 req/hr, but this app previously self-imposed a
 * hardcoded 55/hr cap regardless — so adding a token would have changed
 * nothing, silently. Confirmed while implementing this fix: without this
 * change, `RATE_LIMIT` would still throttle every authenticated deployment
 * down to unauthenticated-tier throughput.
 *
 * PR-075 — set to GitHub's real, exact ceilings (5,000/60) rather than a
 * safety-margined figure below them, per explicit request. `assertRateLimit`
 * throws (a real, app-level `ProviderRateLimitError`) once this budget is
 * exhausted, which is what feeds the stale-cache fallback in
 * `getRepoStats` below — so hitting this ceiling degrades gracefully
 * rather than surfacing raw GitHub 403s.
 */
const RATE_LIMIT: RateLimitConfig = process.env.GITHUB_TOKEN
  ? { limit: 5_000, windowMs: 3_600_000 }
  : { limit: 60, windowMs: 3_600_000 };

export async function getRepoStats(fullName: string): Promise<ProviderResult<RepoStats>> {
  const cacheKey = `${PROVIDER}:repo:${fullName}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const repo = await fetchRepo(fullName);

      let release: RawRelease | null = null;
      try {
        assertRateLimit(PROVIDER, RATE_LIMIT);
        release = await fetchLatestRelease(fullName);
      } catch {
        // Repos without releases are common — this is not a hard failure.
        release = null;
      }

      return mapRepoStats(fullName, repo, release);
    })
  );
  if (result.ok) return result;

  // PR-074 DATA INTEGRITY AUDIT — Engineering Health shouldn't collapse to
  // "Not Assessed" (Repository/Stars/Forks/Language/License/Last Push all
  // blank) just because GitHub's rate limit is exhausted or the API is
  // briefly down. Fall back to the last real, successfully-fetched value
  // for this repo, if this process has ever fetched it — honestly
  // timestamped with when it was ACTUALLY fetched (never "just now"), so
  // the real age of the data is never misrepresented. Only reached when
  // the live fetch above genuinely failed; never masks a real first-ever
  // failure with fabricated data (`undefined` when nothing was ever cached).
  const stale = getStale<RepoStats>(cacheKey);
  if (!stale) return result;
  return { ok: true, data: stale.value, source: PROVIDER, fetchedAt: stale.fetchedAt, stale: true };
}

/** Weekly commit-count trend for a repo — used for real "Developer Activity"/"GitHub Trend" fields (PR10 Part 3, and the Base Radar Brief). */
export async function getCommitActivity(fullName: string): Promise<ProviderResult<CommitActivity>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:commit-activity:${fullName}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const weeks = await fetchCommitActivity(fullName);
      const mapped = mapCommitActivity(fullName, weeks);
      if (!mapped) {
        throw new Error(`No commit activity data available yet for ${fullName} (GitHub may still be computing it)`);
      }
      return mapped;
    })
  );
}

/** Real contributor count (page-1, up to 100) — PR13.7 Goal 2/6, extended/Profile-page-only, same cache/rate-limit budget as every other GitHub call. */
export async function getContributorCount(fullName: string): Promise<ProviderResult<ContributorCount>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:contributors:${fullName}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchContributors(fullName);
      return mapContributorCount(raw);
    })
  );
}

/** Up to 10 most recent releases — real version history for the Timeline (Goal 13) and release-count evidence for the Scorecard's Developer tile (Goal 6). Both reuse this one call, never fetched twice. */
export async function getReleases(fullName: string): Promise<ProviderResult<ReleaseSummary[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:releases:${fullName}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchReleases(fullName);
      return mapReleases(raw);
    })
  );
}

/** Real-time snapshot of GitHub's own rate-limit headers — `null` until this process has made at least one GitHub request. Powers the Evidence & Sources panel's diagnostic GitHub row (PR-074 REVIEW #11). */
export function getRateLimitStatus(): GithubRateLimitSnapshot | null {
  return getGithubRateLimitSnapshot();
}

export type { CommitActivity, ContributorCount, ReleaseSummary, RepoStats };
