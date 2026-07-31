/** Public API for the CoinGecko provider — cache- and rate-limit-guarded. */

import { fetchBaseEcosystemMarkets, fetchCoinDetail, fetchMarketChart, fetchMarketsByIds, fetchSimplePrice } from "@/lib/providers/coingecko/client";
import {
  mapAssetPrice,
  mapCoinMarkets,
  mapGenesisDate,
  mapMajorPrices,
  mapMarketChart,
  mapMarketVolumeSeries,
  type AssetPrice,
  type CoinMarket,
  type MajorPrices,
} from "@/lib/providers/coingecko/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";
import type { SparklinePoint } from "@/lib/data/types";

const PROVIDER = "coingecko" as const;
const CACHE_TTL_MS = 90_000; // matches the window documented in docs/API.md
// CoinGecko's free tier commonly documents ~30 req/min; this is a
// conservative in-process budget, not an authoritative published limit.
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

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

export async function getBaseEcosystemMarkets(perPage = 20): Promise<ProviderResult<CoinMarket[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:markets:${perPage}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchBaseEcosystemMarkets(perPage);
      return mapCoinMarkets(raw);
    })
  );
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
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:markets:by-id:${sortedIds.join(",")}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchMarketsByIds(sortedIds);
      return mapCoinMarkets(raw);
    })
  );
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

export async function getEthPrice(): Promise<ProviderResult<AssetPrice>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:eth-price`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchSimplePrice(["ethereum"]);
      const mapped = mapAssetPrice(raw, "ethereum");
      if (!mapped) throw new ProviderParseError(PROVIDER, "Missing ETH price data in response");
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
