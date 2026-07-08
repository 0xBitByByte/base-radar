/** Public API for the CoinGecko provider — cache- and rate-limit-guarded. */

import { fetchBaseEcosystemMarkets, fetchSimplePrice } from "@/lib/providers/coingecko/client";
import {
  mapAssetPrice,
  mapCoinMarkets,
  mapMajorPrices,
  type AssetPrice,
  type CoinMarket,
  type MajorPrices,
} from "@/lib/providers/coingecko/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

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

export type { AssetPrice, CoinMarket, MajorPrices };
