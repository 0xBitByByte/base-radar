/** Public API for the DexScreener provider — cache- and rate-limit-guarded. */

import { fetchPairsByTokenAddresses, fetchSearchPairs, fetchTokenPairsV1 } from "@/lib/providers/dexscreener/client";
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

/**
 * PR-084.01 — every real pool for ONE project's own token address, via the
 * single-address form of the legacy `/latest/dex/tokens/{address}` endpoint
 * (`fetchPairsByTokenAddresses`, previously unused at runtime). This is a
 * second, additional DexScreener request beyond `getPairsByTokenAddresses`'s
 * bulk call above — justified, not accidental:
 *
 *  - The bulk path structurally can't return this: `fetchTokenPairsV1`
 *    returns only one pair per address by design (see its doc comment), so
 *    no amount of client-side filtering of the bulk result recovers the
 *    other real pools.
 *  - Extending the *bulk* fetch to call this richer endpoint for every
 *    registered project (avoiding a per-project on-demand call) was
 *    considered and rejected: that would cost one live request per
 *    registered project per cache cycle regardless of whether anyone is
 *    viewing it — for ~100+ tracked projects, strictly worse than one
 *    extra request only for the specific project a user is actually on.
 *  - No background/cron sync exists anywhere in this codebase to amortize
 *    the cost outside a page view (checked `lib/sync/*` — that's the
 *    user-facing watchlist/account sync layer, unrelated to provider data).
 *
 * Mitigation: its own longer cache TTL (5 min vs. the 60s used above) —
 * which real pools exist for a project changes far less often than their
 * liquidity/volume figures, so this specific call can safely stay fresher
 * for longer than price-sensitive data.
 */
const PAIRS_FOR_TOKEN_CACHE_TTL_MS = 300_000;

export async function getPairsForToken(address: string): Promise<ProviderResult<Pair[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:pairs-for-token:${address.toLowerCase()}`, PAIRS_FOR_TOKEN_CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchPairsByTokenAddresses([address]);
      return mapTokenPairs(raw.pairs)
        .filter((p) => p.chainId === "base")
        .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
    })
  );
}

export type { Pair };
