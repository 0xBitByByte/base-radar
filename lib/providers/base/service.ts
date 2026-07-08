/** Public API for the Base RPC provider — cache- and rate-limit-guarded. */

import { fetchChainIdHex, fetchGasPriceHex, fetchLatestBlock } from "@/lib/providers/base/client";
import { mapNetworkStatus, type NetworkStatus } from "@/lib/providers/base/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "base" as const;
const CACHE_TTL_MS = 20_000; // matches the window documented in docs/API.md — the shortest of any provider
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

export async function getBaseNetworkStatus(): Promise<ProviderResult<NetworkStatus>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:network-status`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const [gasPriceHex, block, chainIdHex] = await Promise.all([
        fetchGasPriceHex(),
        fetchLatestBlock(),
        fetchChainIdHex(),
      ]);
      return mapNetworkStatus(gasPriceHex, block, chainIdHex);
    })
  );
}

export type { NetworkStatus };
