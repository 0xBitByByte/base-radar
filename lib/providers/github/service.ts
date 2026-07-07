import { fetchLatestRelease, fetchRepo, type RawRelease } from "@/lib/providers/github/client";
import { mapRepoStats, type RepoStats } from "@/lib/providers/github/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderRateLimitError, toProviderError } from "@/lib/providers/common/errors";
import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso } from "@/lib/providers/common/utilities";

const PROVIDER = "github" as const;
const CACHE_TTL_MS = 600_000; // matches the window documented in docs/API.md
// GitHub's unauthenticated limit is a hard 60 req/hour per IP — this stays
// safely under it even across several repos being polled in one process.
const RATE_LIMIT: RateLimitConfig = { limit: 55, windowMs: 3_600_000 };

function guardRateLimit(): void {
  if (!tryAcquire(PROVIDER, RATE_LIMIT)) {
    throw new ProviderRateLimitError(PROVIDER);
  }
}

export async function getRepoStats(fullName: string): Promise<ProviderResult<RepoStats>> {
  try {
    const data = await getOrSet(`${PROVIDER}:repo:${fullName}`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const repo = await fetchRepo(fullName);

      let release: RawRelease | null = null;
      try {
        guardRateLimit();
        release = await fetchLatestRelease(fullName);
      } catch {
        // Repos without releases are common — this is not a hard failure.
        release = null;
      }

      return mapRepoStats(fullName, repo, release);
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export type { RepoStats };
