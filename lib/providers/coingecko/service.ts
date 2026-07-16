/** Public API for the CoinGecko provider — cache- and rate-limit-guarded. */

import { fetchBaseEcosystemMarkets, fetchCoinDetail, fetchMarketChart, fetchSimplePrice } from "@/lib/providers/coingecko/client";
import {
  mapAssetPrice,
  mapCoinMarkets,
  mapGenesisDate,
  mapMajorPrices,
  mapMarketChart,
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

export async function getBaseEcosystemMarkets(perPage = 20): Promise<ProviderResult<CoinMarket[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:markets:${perPage}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchBaseEcosystemMarkets(perPage);
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
  const label = `getCoinDetail:${id}`;
  console.time(label);
  try {
    return await toProviderResult(PROVIDER, () =>
      getOrSet(`${PROVIDER}:coin-detail:${id}`, CACHE_TTL_MS, async () => {
        assertRateLimit(PROVIDER, RATE_LIMIT);
        const raw = await fetchCoinDetail(id);
        return mapGenesisDate(raw);
      })
    );
  } finally {
    console.timeEnd(label);
  }
}

/** Historical price series for a given period, used by the Price chart's period filters. */
export async function getMarketChart(id: string, days: number | "max"): Promise<ProviderResult<SparklinePoint[] | null>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:market-chart:${id}:${days}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchMarketChart(id, days);
      return mapMarketChart(raw);
    })
  );
}

export type { AssetPrice, CoinMarket, MajorPrices };
