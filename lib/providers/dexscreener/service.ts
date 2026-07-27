/** Public API for the DexScreener provider — cache- and rate-limit-guarded. */

import { fetchPairsByTokenAddresses, fetchSearchPairs } from "@/lib/providers/dexscreener/client";
import { mapBasePairs, mapTokenPairs, type Pair } from "@/lib/providers/dexscreener/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "dexscreener" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

// DexScreener's real, documented cap on comma-separated addresses per `/tokens/{addresses}` call.
const TOKEN_LOOKUP_CHUNK_SIZE = 30;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function getBaseTrendingPairs(): Promise<ProviderResult<Pair[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:base-trending`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchSearchPairs("base");
      return mapBasePairs(raw.pairs);
    })
  );
}

/**
 * PR-051 — direct on-chain lookup by token contract address, batched (up to
 * 30 addresses per request, chunked defensively as the registry grows).
 * Real, exact, and not limited to "currently trending" pairs the way
 * `getBaseTrendingPairs`'s keyword search is — see
 * docs/PROVIDER_DATA_COVERAGE_AUDIT.md §5.2. Called once per batch (shared
 * across every registry project with a registered Base token contract),
 * mirroring `getBaseTrendingPairs`'s own "one shared fetch" pattern rather
 * than one request per project. Results are not chain-filtered here —
 * callers filter against each project's own `dexscreenerChainId`.
 */
export async function getPairsByTokenAddresses(addresses: string[]): Promise<ProviderResult<Pair[]>> {
  if (addresses.length === 0) {
    return toProviderResult(PROVIDER, () => Promise.resolve<Pair[]>([]));
  }

  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:token-pairs:${[...addresses].sort().join(",")}`, CACHE_TTL_MS, async () => {
      const results: Pair[] = [];
      for (const group of chunk(addresses, TOKEN_LOOKUP_CHUNK_SIZE)) {
        assertRateLimit(PROVIDER, RATE_LIMIT);
        const raw = await fetchPairsByTokenAddresses(group);
        results.push(...mapTokenPairs(raw.pairs));
      }
      return results;
    })
  );
}

export type { Pair };
