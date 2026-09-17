/** Public API for the DexScreener provider — cache- and rate-limit-guarded. */

import { fetchPairsByTokenAddresses, fetchSearchPairs, fetchTokenPairsV1 } from "@/lib/providers/dexscreener/client";
import { mapBasePairs, mapTokenPairs, type Pair } from "@/lib/providers/dexscreener/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult, withStaleFallback } from "@/lib/providers/common/utilities";

const PROVIDER = "dexscreener" as const;
// PR-098.07 — was 60s; retuned to the floor of the "DEX Liquidity/Volume"
// and "Onchain Activity" freshness classes (~5min / 5-10min,
// `lib/intelligence/freshness.ts`) — both dimensions this provider feeds
// share this one real cache entry, so one TTL serves both. Matches
// docs/API.md's updated window and the file's own existing
// `PAIRS_FOR_TOKEN_CACHE_TTL_MS` precedent below.
const CACHE_TTL_MS = 300_000;
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

/**
 * Final Production Hardening PR — moved to `dexscreener/rateLimitStatus.ts`
 * (a pure module with no `client.ts`/fetch import), re-exported here so
 * every existing server-side consumer of `"@/lib/providers/dexscreener/service"`
 * is unaffected.
 */
export { getRateLimitStatus } from "@/lib/providers/dexscreener/rateLimitStatus";

// DexScreener's real, documented cap on comma-separated addresses per `/tokens/{addresses}` call.
const TOKEN_LOOKUP_CHUNK_SIZE = 30;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * PR-098.07 — added `withStaleFallback`, previously absent from every
 * DexScreener call (confirmed: this file had zero uses, unlike CoinGecko/
 * DefiLlama/Blockscout/GitHub). Feeds the "DEX Liquidity/Volume" and
 * "Onchain Activity" freshness classes — a transient DexScreener outage
 * should degrade to the last real trending-pairs snapshot, not blank
 * trading data out entirely.
 */
export async function getBaseTrendingPairs(): Promise<ProviderResult<Pair[]>> {
  const cacheKey = `${PROVIDER}:base-trending`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchSearchPairs("base");
      return mapBasePairs(raw.pairs);
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

/**
 * Trading Discovery Strategy, `"dex"` kind — every currently-trending Base
 * pool whose `dexId` matches one of the given slugs, for a DEX-category
 * project with no single governance token to key a lookup off of (see
 * `lib/trading/discoveryStrategy.ts`). Reuses `getBaseTrendingPairs()`'s
 * own cached fetch and rate-limit budget rather than a second network call
 * — this is a client-side filter over data already being fetched for the
 * Explorer/Dashboard trending surfaces, not a new request.
 *
 * Honest limitation, not a bug: DexScreener's public API has no "list
 * every pool for this exchange" endpoint — `fetchSearchPairs("base")` only
 * ever returns *currently-trending* Base pairs. A real DEX with genuine
 * on-chain pools can still return zero here if none of its pools happen to
 * be trending right now (confirmed live: Curve's Base pools didn't surface
 * this way at all, while Uniswap/Aerodrome/Balancer/PancakeSwap pools did)
 * — exactly the same trending-only ceiling `matchTrading`'s
 * `dexscreenerPairAddresses` fallback path already documents for the
 * token-address case.
 */
export async function getPairsByDexId(dexIds: string[]): Promise<ProviderResult<Pair[]>> {
  const trending = await getBaseTrendingPairs();
  if (!trending.ok) return trending;
  const dexIdSet = new Set(dexIds);
  return {
    ...trending,
    data: trending.data.filter((pair) => dexIdSet.has(pair.dexId)),
  };
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
/** PR-098.07 — added `withStaleFallback`, same reasoning as `getBaseTrendingPairs` above (this is the call `fetchProviderBulkData()` actually uses for TVL/market's Trading Discovery Strategy "token" path). */
export async function getPairsByTokenAddresses(addresses: string[]): Promise<ProviderResult<Pair[]>> {
  if (addresses.length === 0) {
    return toProviderResult(PROVIDER, () => Promise.resolve<Pair[]>([]));
  }

  const cacheKey = `${PROVIDER}:token-pairs-v1:${[...addresses].sort().join(",")}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      const results: Pair[] = [];
      for (const group of chunk(addresses, TOKEN_LOOKUP_CHUNK_SIZE)) {
        assertRateLimit(PROVIDER, RATE_LIMIT);
        const raw = await fetchTokenPairsV1("base", group);
        results.push(...mapTokenPairs(raw));
      }
      return results;
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
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
