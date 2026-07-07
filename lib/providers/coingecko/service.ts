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
import { ProviderParseError, ProviderRateLimitError, toProviderError } from "@/lib/providers/common/errors";
import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso } from "@/lib/providers/common/utilities";

const PROVIDER = "coingecko" as const;
const CACHE_TTL_MS = 90_000; // matches the window documented in docs/API.md
// CoinGecko's free tier commonly documents ~30 req/min; this is a
// conservative in-process budget, not an authoritative published limit.
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

function guardRateLimit(): void {
  if (!tryAcquire(PROVIDER, RATE_LIMIT)) {
    throw new ProviderRateLimitError(PROVIDER);
  }
}

export async function getBaseEcosystemMarkets(perPage = 20): Promise<ProviderResult<CoinMarket[]>> {
  try {
    const data = await getOrSet(`${PROVIDER}:markets:${perPage}`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchBaseEcosystemMarkets(perPage);
      return mapCoinMarkets(raw);
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export async function getMajorPrices(): Promise<ProviderResult<MajorPrices>> {
  try {
    const data = await getOrSet(`${PROVIDER}:major-prices`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchSimplePrice(["ethereum", "bitcoin"]);
      const mapped = mapMajorPrices(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "Missing ETH/BTC price data in response");
      return mapped;
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export async function getEthPrice(): Promise<ProviderResult<AssetPrice>> {
  try {
    const data = await getOrSet(`${PROVIDER}:eth-price`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchSimplePrice(["ethereum"]);
      const mapped = mapAssetPrice(raw, "ethereum");
      if (!mapped) throw new ProviderParseError(PROVIDER, "Missing ETH price data in response");
      return mapped;
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export type { AssetPrice, CoinMarket, MajorPrices };
