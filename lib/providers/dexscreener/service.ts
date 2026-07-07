import { fetchSearchPairs } from "@/lib/providers/dexscreener/client";
import { mapBasePairs, type Pair } from "@/lib/providers/dexscreener/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderRateLimitError, toProviderError } from "@/lib/providers/common/errors";
import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso } from "@/lib/providers/common/utilities";

const PROVIDER = "dexscreener" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

function guardRateLimit(): void {
  if (!tryAcquire(PROVIDER, RATE_LIMIT)) {
    throw new ProviderRateLimitError(PROVIDER);
  }
}

export async function getBaseTrendingPairs(): Promise<ProviderResult<Pair[]>> {
  try {
    const data = await getOrSet(`${PROVIDER}:base-trending`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchSearchPairs("base");
      return mapBasePairs(raw.pairs);
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export type { Pair };
