/** Public API for the Blockscout provider — cache- and rate-limit-guarded. */

import { fetchChainStats, fetchRecentSmartContracts } from "@/lib/providers/blockscout/client";
import {
  mapChainStats,
  mapRecentlyVerifiedContract,
  type ChainStats,
  type VerifiedContract,
} from "@/lib/providers/blockscout/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "blockscout" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

export async function getChainStats(): Promise<ProviderResult<ChainStats>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:chain-stats`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchChainStats();
      return mapChainStats(raw);
    })
  );
}

export async function getRecentlyVerifiedContract(): Promise<ProviderResult<VerifiedContract>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:recently-verified`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchRecentSmartContracts();
      const mapped = mapRecentlyVerifiedContract(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No recently verified contracts returned");
      return mapped;
    })
  );
}

export type { ChainStats, VerifiedContract };
