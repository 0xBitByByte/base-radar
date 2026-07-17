/** Public API for the Base RPC provider — cache- and rate-limit-guarded. */

import { fetchChainIdHex, fetchGasPriceHex, fetchLatestBlock, fetchSafeBlock } from "@/lib/providers/base/client";
import { mapFinality, mapNetworkStatus, type NetworkStatus } from "@/lib/providers/base/mapper";
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

/**
 * PR13.7 Goal 14 — real finality lag (latest block number minus the
 * chain's own "safe" block number). Deliberately a separate cache entry
 * from `getBaseNetworkStatus`, and NOT live-polled by `useLiveNetworkStatus`
 * — adding a second RPC call to that hook's 45s loop would triple its real
 * request cost for a figure that changes slowly; this is fetched once,
 * extended/Profile-page-only, same as `genesisPromise`.
 */
export async function getFinality(): Promise<ProviderResult<number>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:finality`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const [latestBlock, safeBlock] = await Promise.all([fetchLatestBlock(), fetchSafeBlock()]);
      return mapFinality(latestBlock.number, safeBlock.number);
    })
  );
}

export type { NetworkStatus };
