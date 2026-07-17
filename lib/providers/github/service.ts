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
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "github" as const;
const CACHE_TTL_MS = 600_000; // matches the window documented in docs/API.md
// GitHub's unauthenticated limit is a hard 60 req/hour per IP — this stays
// safely under it even across several repos being polled in one process.
const RATE_LIMIT: RateLimitConfig = { limit: 55, windowMs: 3_600_000 };

export async function getRepoStats(fullName: string): Promise<ProviderResult<RepoStats>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:repo:${fullName}`, CACHE_TTL_MS, async () => {
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

export type { CommitActivity, ContributorCount, ReleaseSummary, RepoStats };
