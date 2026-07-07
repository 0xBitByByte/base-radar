import { fetchChainIdHex, fetchGasPriceHex, fetchLatestBlock } from "@/lib/providers/base/client";
import { mapNetworkStatus, type NetworkStatus } from "@/lib/providers/base/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderRateLimitError, toProviderError } from "@/lib/providers/common/errors";
import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso } from "@/lib/providers/common/utilities";

const PROVIDER = "base" as const;
const CACHE_TTL_MS = 20_000; // matches the window documented in docs/API.md — the shortest of any provider
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

function guardRateLimit(): void {
  if (!tryAcquire(PROVIDER, RATE_LIMIT)) {
    throw new ProviderRateLimitError(PROVIDER);
  }
}

export async function getBaseNetworkStatus(): Promise<ProviderResult<NetworkStatus>> {
  try {
    const data = await getOrSet(`${PROVIDER}:network-status`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const [gasPriceHex, block, chainIdHex] = await Promise.all([
        fetchGasPriceHex(),
        fetchLatestBlock(),
        fetchChainIdHex(),
      ]);
      return mapNetworkStatus(gasPriceHex, block, chainIdHex);
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export type { NetworkStatus };
