/** Public API for the CoinGecko provider — cache- and rate-limit-guarded. */

import { fetchBaseEcosystemMarkets, fetchCoinByContractAddress, fetchCoinDetail, fetchCoinMarketByContractAddress, fetchMarketChart, fetchMarketsByIds, fetchSimplePrice } from "@/lib/providers/coingecko/client";
import {
  mapCoinMarkets,
  mapContractImageUrl,
  mapContractPrice,
  mapGenesisDate,
  mapMajorPrices,
  mapMarketChart,
  mapMarketVolumeSeries,
  type AssetPrice,
  type CoinMarket,
  type MajorPrices,
} from "@/lib/providers/coingecko/mapper";
import { getOrSet, getStale } from "@/lib/providers/common/cache";
import { ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult, withStaleFallback } from "@/lib/providers/common/utilities";
import type { SparklinePoint } from "@/lib/data/types";

const PROVIDER = "coingecko" as const;
// PR-098.07 — was 90s; retuned to the floor of the "Token Price / Token
// 24H" freshness class (2-5min, `lib/intelligence/freshness.ts`'s
// `FRESHNESS_CLASSES.tokenPrice`) — matches docs/API.md's updated window.
const CACHE_TTL_MS = 120_000;
// CoinGecko's free tier commonly documents ~30 req/min; this is a
// conservative in-process budget, not an authoritative published limit.
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

/**
 * Final Production Hardening PR — moved to `coingecko/rateLimitStatus.ts`
 * (a pure module with no `client.ts`/fetch import), re-exported here so
 * every existing server-side consumer of `"@/lib/providers/coingecko/service"`
 * is unaffected.
 */
export { getRateLimitStatus } from "@/lib/providers/coingecko/rateLimitStatus";

/**
 * PR-054 — the real page size `lib/intelligence/sources.ts`'s
 * `fetchProviderBulkData()` already uses for its own bulk fetch. Every
 * other caller of `getBaseEcosystemMarkets()` (the `coingecko` discovery
 * source included) should pass this same constant rather than a different
 * literal — the cache key below is keyed by `perPage`, so two call sites
 * that want "the same bulk Base-ecosystem list" but pass different values
 * silently defeat `getOrSet()`'s de-duplication and each pay for their own
 * network round trip. See docs/PR-054_LIVE_PROJECTS_SERVICE.md's
 * Performance section for the real duplicate-call this constant fixes.
 */
export const BASE_ECOSYSTEM_MARKETS_PAGE_SIZE = 250;

/**
 * PR-098.02 — feeds every project's `market` slice (price, 24h/7d/30d
 * change, market cap, ...) via `sources.ts`'s `matchMarket`, the sole
 * source `mergeMarket` reads `changePct24h` from. Previously had no
 * `withStaleFallback` at all — unlike DefiLlama's `getBaseChainTvl`,
 * Blockscout's verified-contract lookups, and GitHub's repo stats, a
 * transient CoinGecko failure blanked every project's price/24h-change
 * straight to unavailable instead of degrading to the last real,
 * successfully-fetched value. Wired in now, matching that same established
 * pattern exactly — CoinGecko is the preferred, and for 24h token price
 * change the ONLY, real source this engine has, so it's the one provider
 * where this gap mattered most.
 */
export async function getBaseEcosystemMarkets(perPage = 20): Promise<ProviderResult<CoinMarket[]>> {
  const cacheKey = `${PROVIDER}:markets:${perPage}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchBaseEcosystemMarkets(perPage);
      return mapCoinMarkets(raw);
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

/**
 * PR-072 — backfills market data (price, market cap, and crucially the token
 * `image` URL) for registry projects CoinGecko's `category=base-ecosystem`
 * tagging misses entirely — see `fetchMarketsByIds`'s own doc comment.
 * `ids` is expected to be every registry project's configured
 * `providerIds.coingeckoId` (`sources.ts`'s `collectRegistryCoingeckoIds`),
 * a small, fixed list — one batched request, cached the same way as every
 * other bulk fetch here. Returns an empty result (not an error) for an
 * empty `ids` list, since there's nothing to fetch.
 */
export async function getMarketsByIds(ids: string[]): Promise<ProviderResult<CoinMarket[]>> {
  if (ids.length === 0) {
    return { ok: true, data: [], source: PROVIDER, fetchedAt: new Date().toISOString() };
  }
  const sortedIds = [...ids].sort();
  // PR-098.02 — same `withStaleFallback` gap as `getBaseEcosystemMarkets`
  // above; this is the id-based backfill `mergeMarketResults` (sources.ts)
  // relies on for every registry project CoinGecko's category tagging
  // misses (e.g. Uniswap), so it needs the same resilience.
  const cacheKey = `${PROVIDER}:markets:by-id:${sortedIds.join(",")}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchMarketsByIds(sortedIds);
      return mapCoinMarkets(raw);
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

export async function getMajorPrices(): Promise<ProviderResult<MajorPrices>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:major-prices`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchSimplePrice(["ethereum", "bitcoin"]);
      const mapped = mapMajorPrices(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "Missing ETH/BTC price data in response");
      return mapped;
    })
  );
}

/** Genesis/launch date for a single coin — heavier per-coin endpoint, only called on the Project Profile page. */
export async function getCoinDetail(id: string): Promise<ProviderResult<string | null>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:coin-detail:${id}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchCoinDetail(id);
      return mapGenesisDate(raw);
    })
  );
}

// Token Logo System — a contract's real logo never changes, unlike price
// data, so this cache lives far longer than `CACHE_TTL_MS`'s 90s: reduces
// both outbound request volume and exposure to the rate limiting already
// observed live against this provider under normal use.
const LOGO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Token Logo System, tier 1 — resolves a token's real logo directly by
 * on-chain contract address, the most collision-safe identifier (unlike a
 * symbol, which many real, unrelated tokens can share). Used for tokens
 * this app has no other identifier for, e.g. a pool's quote/secondary
 * token. Returns `null` — never throws up to the caller — both when
 * CoinGecko genuinely has no listing for this address (a common, expected
 * outcome, not a failure) and on any other fetch/parse error; a caller
 * getting `null` simply falls through to the next resolution tier.
 *
 * A live failure (rate limit, network error) falls back to `getStale()` —
 * the last real, successfully-resolved image for this exact address, even
 * past its 24h TTL — before giving up. A contract's logo is effectively
 * permanent, so serving an hours-old cached image under rate-limit pressure
 * is strictly better than an unnecessary trip to the generic initials
 * badge for a token this process has already resolved once before.
 */
export async function getTokenLogoByAddress(address: string): Promise<string | null> {
  const cacheKey = `${PROVIDER}:token-logo-by-address:base:${address.toLowerCase()}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, LOGO_CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchCoinByContractAddress("base", address);
      return mapContractImageUrl(raw);
    })
  );
  if (result.ok) return result.data;
  return getStale<string | null>(cacheKey)?.value ?? null;
}

/**
 * V3-WALLET-002 — portfolio pricing fallback tier: only ever called for a
 * token Blockscout's own `exchange_rate` came back `null` for (see
 * `lib/portfolio/pricing.ts`). Same address-keyed cache pattern as
 * `getTokenLogoByAddress`, same graceful-degrade-to-last-known-value on a
 * live failure — a slightly stale real price is still more honest than
 * silently showing no price at all for a token whose value genuinely is
 * known, just not reachable this instant. Uses the provider's own standard
 * `CACHE_TTL_MS` (90s), not the logo tier's 24h cache — a price changes
 * constantly; a logo doesn't.
 */
export async function getTokenPriceByAddress(address: string): Promise<number | null> {
  const cacheKey = `${PROVIDER}:token-price-by-address:base:${address.toLowerCase()}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchCoinMarketByContractAddress("base", address);
      return mapContractPrice(raw);
    })
  );
  if (result.ok) return result.data;
  return getStale<number | null>(cacheKey)?.value ?? null;
}

export type MarketChart = {
  prices: SparklinePoint[] | null;
  /** PR13.7 Goal 9 — same raw response, same cache entry as `prices`; reading `total_volumes` costs nothing extra since the fetch already happened for the price series. */
  volumes: SparklinePoint[] | null;
};

/** Historical price + volume series for a given period, used by the Price chart's period filters (prices) and Goal 9's Average Volume stat (volumes) — one cached fetch serves both. */
export async function getMarketChart(id: string, days: number | "max"): Promise<ProviderResult<MarketChart>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:market-chart:${id}:${days}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchMarketChart(id, days);
      return { prices: mapMarketChart(raw), volumes: mapMarketVolumeSeries(raw) };
    })
  );
}

export type { AssetPrice, CoinMarket, MajorPrices };
