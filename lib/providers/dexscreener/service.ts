/** Public API for the DexScreener provider — cache- and rate-limit-guarded. */

import { fetchSearchPairs, fetchTokenPairsV1 } from "@/lib/providers/dexscreener/client";
import { mapBasePairs, mapTokenPairs, type Pair } from "@/lib/providers/dexscreener/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, getRateLimitStatus as getSharedRateLimitStatus, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "dexscreener" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

/**
 * PR-074 REVIEW #8 — real-time read of this provider's own app-enforced
 * rate-limit budget (see `common/rate-limit.ts`'s `getRateLimitStatus`),
 * exposed for the Evidence & Sources panel to report exact remaining/
 * limit/reset numbers instead of a generic "try again later" — the same
 * pattern already built for GitHub's response-header-based tracker.
 */
export function getRateLimitStatus() {
  return getSharedRateLimitStatus(PROVIDER, RATE_LIMIT);
}

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
 * than one request per project.
 *
 * PR-074 REVIEW — switched from the legacy `/latest/dex/tokens/{addresses}`
 * endpoint to `/tokens/v1/base/{addresses}` (`fetchTokenPairsV1`). Confirmed
 * live: the legacy endpoint truncates its response to a total of 30 pairs
 * shared across every address in the batch, silently dropping entire
 * addresses once that cap is hit — Aave's real, substantial liquidity was
 * being dropped this way, always rendering as "Not Tracked" downstream.
 * `/tokens/v1/{chainId}/{addresses}` is chain-scoped (every registry
 * project's `dexscreenerChainId` is "base" — see `data/projects/validation.ts`)
 * and returns one real pair per address with no cross-address truncation.
 */
export async function getPairsByTokenAddresses(addresses: string[]): Promise<ProviderResult<Pair[]>> {
  if (addresses.length === 0) {
    return toProviderResult(PROVIDER, () => Promise.resolve<Pair[]>([]));
  }

  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:token-pairs-v1:${[...addresses].sort().join(",")}`, CACHE_TTL_MS, async () => {
      const results: Pair[] = [];
      for (const group of chunk(addresses, TOKEN_LOOKUP_CHUNK_SIZE)) {
        assertRateLimit(PROVIDER, RATE_LIMIT);
        const raw = await fetchTokenPairsV1("base", group);
        results.push(...mapTokenPairs(raw));
      }
      return results;
    })
  );
}

export type { Pair };
