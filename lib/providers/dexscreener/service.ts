/** Public API for the DexScreener provider — cache- and rate-limit-guarded. */

import { fetchSearchPairs } from "@/lib/providers/dexscreener/client";
import { mapBasePairs, type Pair } from "@/lib/providers/dexscreener/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { toProviderResult } from "@/lib/providers/common/utilities";

const PROVIDER = "dexscreener" as const;
const CACHE_TTL_MS = 60_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

export async function getBaseTrendingPairs(): Promise<ProviderResult<Pair[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:base-trending`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchSearchPairs("base");
      return mapBasePairs(raw.pairs);
    })
  );
}

export type { Pair };
