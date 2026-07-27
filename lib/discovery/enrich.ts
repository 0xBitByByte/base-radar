/**
 * PR-053 — Provider Enrichment (Task 1's pipeline stage between Registry
 * Matching and Classification). Answers two of the brief's Goals
 * questions directly: "which have active development?" and "which are
 * abandoned?"
 *
 * Two real evidence sources, never a new provider integration:
 *
 * 1. Market/TVL evidence already sitting in the deduplicated candidate's
 *    own `providerMetadata` — `coingecko`/`defillama` discovery already
 *    fetch this as part of their bulk listing call; this module only
 *    reads more of a response already in memory, exactly like PR-052's
 *    own "read more of an already-fetched response" pattern. Zero new
 *    network calls for this part.
 * 2. GitHub commit-activity, but ONLY for a candidate that
 *    `registryMatch.ts` already matched to an existing registry project
 *    with a real `github.repo` — reusing `github.getCommitActivity()`
 *    (`lib/providers/github/service.ts`), the same wrapper
 *    `lib/intelligence/` already calls, same cache/rate-limit budget. This
 *    is deliberately never called for the bulk of brand-new/unmatched
 *    candidates (which have no repo to check) — bounding real call volume
 *    to "already-tracked projects being rediscovered," never an unbounded
 *    fan-out across hundreds of live discovery candidates.
 */

import * as github from "@/lib/providers/github/service";
import type { DeduplicatedCandidate } from "@/lib/discovery/dedupe";
import type { RegistryMatch } from "@/lib/discovery/registryMatch";

export type GithubActivityEvidence = {
  commitsLast7d: number | null;
  /** `true` when at least one real commit landed in the last 7 days — the concrete evidence behind "active development" vs. "abandoned." */
  hasRecentActivity: boolean;
};

export type EnrichmentEvidence = {
  hasLiveMarketData: boolean;
  hasLiveTvlData: boolean;
  volume24hUsd: number | null;
  tvlUsd: number | null;
  changePct24h: number | null;
  /** `null` when no matched registry project has a specific GitHub repo to check — never a fabricated "no activity" claim in that case. */
  githubActivity: GithubActivityEvidence | null;
};

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Pure — reads whatever market/TVL fields are already present across the
 * deduplicated candidate's contributing raw candidates' `providerMetadata`.
 * Never makes a network call, so this half of enrichment is fully
 * deterministic and synchronously testable.
 */
export function extractMarketEvidence(deduped: DeduplicatedCandidate): Omit<EnrichmentEvidence, "githubActivity"> {
  const contributors = [deduped.primary, ...deduped.duplicates];

  let volume24hUsd: number | null = null;
  let tvlUsd: number | null = null;
  let changePct24h: number | null = null;

  for (const candidate of contributors) {
    volume24hUsd ??= readNumber(candidate.providerMetadata.volume24hUsd);
    tvlUsd ??= readNumber(candidate.providerMetadata.tvlUsd);
    changePct24h ??= readNumber(candidate.providerMetadata.changePct24h);
  }

  return {
    hasLiveMarketData: volume24hUsd !== null,
    hasLiveTvlData: tvlUsd !== null,
    volume24hUsd,
    tvlUsd,
    changePct24h,
  };
}

/**
 * Full enrichment, including the one real (optional) GitHub call. Never
 * throws — a GitHub failure (rate limit, network error) degrades
 * `githubActivity` to `null` rather than failing the whole candidate,
 * matching every other provider call's "never throw past this boundary"
 * convention in this codebase.
 */
export async function enrichCandidate(deduped: DeduplicatedCandidate, registryMatch: RegistryMatch): Promise<EnrichmentEvidence> {
  const marketEvidence = extractMarketEvidence(deduped);

  const repoRef = registryMatch.project?.github;
  if (!repoRef?.repo) {
    return { ...marketEvidence, githubActivity: null };
  }

  try {
    const result = await github.getCommitActivity(`${repoRef.owner}/${repoRef.repo}`);
    if (!result.ok) return { ...marketEvidence, githubActivity: null };

    return {
      ...marketEvidence,
      githubActivity: {
        commitsLast7d: result.data.commitsLast7d,
        hasRecentActivity: result.data.commitsLast7d > 0,
      },
    };
  } catch {
    return { ...marketEvidence, githubActivity: null };
  }
}
