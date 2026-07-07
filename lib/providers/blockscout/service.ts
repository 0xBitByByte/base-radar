import { fetchChainStats, fetchRecentSmartContracts } from "@/lib/providers/blockscout/client";
import {
  mapChainStats,
  mapRecentlyVerifiedContract,
  type ChainStats,
  type VerifiedContract,
} from "@/lib/providers/blockscout/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderParseError, ProviderRateLimitError, toProviderError } from "@/lib/providers/common/errors";
import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso } from "@/lib/providers/common/utilities";

const PROVIDER = "blockscout" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

function guardRateLimit(): void {
  if (!tryAcquire(PROVIDER, RATE_LIMIT)) {
    throw new ProviderRateLimitError(PROVIDER);
  }
}

export async function getChainStats(): Promise<ProviderResult<ChainStats>> {
  try {
    const data = await getOrSet(`${PROVIDER}:chain-stats`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchChainStats();
      return mapChainStats(raw);
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export async function getRecentlyVerifiedContract(): Promise<ProviderResult<VerifiedContract>> {
  try {
    const data = await getOrSet(`${PROVIDER}:recently-verified`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchRecentSmartContracts();
      const mapped = mapRecentlyVerifiedContract(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No recently verified contracts returned");
      return mapped;
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export type { ChainStats, VerifiedContract };
