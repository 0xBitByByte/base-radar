/** Public API for the DefiLlama provider — cache- and rate-limit-guarded. */

import {
  fetchAllProtocols,
  fetchHistoricalChainTvl,
  fetchProtocolTvlHistory,
  fetchStablecoinChart,
} from "@/lib/providers/defillama/client";
import {
  mapChainProtocols,
  mapChainTvl,
  mapProtocolTvlHistory,
  mapStablecoinMcap,
  type ChainTvl,
  type Protocol,
} from "@/lib/providers/defillama/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderParseError } from "@/lib/providers/common/errors";
import { assertRateLimit, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso, toProviderResult, withStaleFallback } from "@/lib/providers/common/utilities";
import type { SparklinePoint } from "@/lib/data/types";

const PROVIDER = "defillama" as const;
const CHAIN = "Base";
// PR-098.07 — was 2min; retuned into the "TVL" freshness class (10-15min,
// `lib/intelligence/freshness.ts`) — protocol TVL genuinely moves on the
// order of hours, not seconds; 2min was needlessly aggressive for the
// signal's real volatility. Matches docs/API.md's updated window.
const CACHE_TTL_MS = 720_000;
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

/**
 * Final Production Hardening PR — moved to `defillama/rateLimitStatus.ts`
 * (a pure module with no `client.ts`/fetch import), re-exported here so
 * every existing server-side consumer of `"@/lib/providers/defillama/service"`
 * is unaffected.
 */
export { getRateLimitStatus } from "@/lib/providers/defillama/rateLimitStatus";

/**
 * Final Production Readiness PR — feeds the Dashboard's headline TVL stat
 * and the topbar ticker, both prominent, high-traffic reads. A transient
 * DefiLlama failure now degrades to the last real, successfully-fetched
 * value (`withStaleFallback`, honestly tagged `stale: true`) instead of
 * blanking the figure entirely — the same pattern already proven for
 * GitHub's `getRepoStats`/CoinGecko's logo resolution.
 */
export async function getBaseChainTvl(): Promise<ProviderResult<ChainTvl>> {
  const cacheKey = `${PROVIDER}:chain-tvl:${CHAIN}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchHistoricalChainTvl(CHAIN);
      const mapped = mapChainTvl(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No historical TVL points returned");
      return mapped;
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

export async function getBaseStablecoinMcap(): Promise<ProviderResult<number>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:stablecoin-mcap:${CHAIN}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchStablecoinChart(CHAIN);
      const mapped = mapStablecoinMcap(raw);
      if (mapped === null) throw new ProviderParseError(PROVIDER, "No stablecoin market cap data returned");
      return mapped;
    })
  );
}

/**
 * PR-098.06 — the real, most heavily depended-on DefiLlama call in this
 * codebase (every project's TVL, across the whole app, ultimately reads
 * this one bulk list) had no `withStaleFallback` at all, unlike its
 * sibling `getBaseChainTvl` right above — a transient DefiLlama outage
 * blanked every project's TVL to unavailable instead of degrading to the
 * last real, successfully-fetched list. A genuine gap this audit found
 * while building a "stale cache" test for the Featured Intelligence
 * refresh cycle. Fixed to match the same established pattern.
 */
export async function getBaseProtocols(): Promise<ProviderResult<Protocol[]>> {
  const cacheKey = `${PROVIDER}:protocols:${CHAIN}`;
  const result = await toProviderResult(PROVIDER, () =>
    getOrSet(cacheKey, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchAllProtocols();
      return mapChainProtocols(raw, CHAIN);
    })
  );
  return withStaleFallback(PROVIDER, cacheKey, result);
}

/** Delegates to `getBaseProtocols` — no independent cache/rate-limit/network call of its own. */
export async function getTopBaseProtocol(): Promise<ProviderResult<Protocol>> {
  const protocols = await getBaseProtocols();
  if (!protocols.ok) return protocols;
  const top = protocols.data[0];
  if (!top) {
    return { ok: false, source: PROVIDER, error: new ProviderParseError(PROVIDER, "No protocols found for chain") };
  }
  return { ok: true, data: top, source: PROVIDER, fetchedAt: nowIso() };
}


/** For the Project Profile's TVL chart (PR11 Part 5) — real per-protocol historical TVL, keyed by DefiLlama slug. */
export async function getProtocolTvlHistory(slug: string): Promise<ProviderResult<SparklinePoint[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:protocol-tvl:${slug}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchProtocolTvlHistory(slug);
      const mapped = mapProtocolTvlHistory(raw, CHAIN);
      if (!mapped) throw new ProviderParseError(PROVIDER, `No TVL history returned for protocol "${slug}"`);
      return mapped;
    })
  );
}

export type { ChainTvl, Protocol };
