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
import { nowIso, toProviderResult } from "@/lib/providers/common/utilities";
import type { SparklinePoint } from "@/lib/data/types";

const PROVIDER = "defillama" as const;
const CHAIN = "Base";
const CACHE_TTL_MS = 120_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

export async function getBaseChainTvl(): Promise<ProviderResult<ChainTvl>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:chain-tvl:${CHAIN}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchHistoricalChainTvl(CHAIN);
      const mapped = mapChainTvl(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No historical TVL points returned");
      return mapped;
    })
  );
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

export async function getBaseProtocols(): Promise<ProviderResult<Protocol[]>> {
  return toProviderResult(PROVIDER, () =>
    getOrSet(`${PROVIDER}:protocols:${CHAIN}`, CACHE_TTL_MS, async () => {
      assertRateLimit(PROVIDER, RATE_LIMIT);
      const raw = await fetchAllProtocols();
      return mapChainProtocols(raw, CHAIN);
    })
  );
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

/** Delegates to `getBaseProtocols` — no independent cache/rate-limit/network call of its own. */
export async function getBaseProjectCount(): Promise<ProviderResult<number>> {
  const protocols = await getBaseProtocols();
  if (!protocols.ok) return protocols;
  return { ok: true, data: protocols.data.length, source: PROVIDER, fetchedAt: nowIso() };
}

/** For the Project Profile's TVL chart (PR11 Part 5) — real per-protocol historical TVL, keyed by DefiLlama slug. */
export async function getProtocolTvlHistory(slug: string): Promise<ProviderResult<SparklinePoint[]>> {
  const label = `getProtocolTvlHistory:${slug}`;
  console.time(label);
  try {
    return await toProviderResult(PROVIDER, () =>
      getOrSet(`${PROVIDER}:protocol-tvl:${slug}`, CACHE_TTL_MS, async () => {
        assertRateLimit(PROVIDER, RATE_LIMIT);
        const raw = await fetchProtocolTvlHistory(slug);
        const mapped = mapProtocolTvlHistory(raw, CHAIN);
        if (!mapped) throw new ProviderParseError(PROVIDER, `No TVL history returned for protocol "${slug}"`);
        return mapped;
      })
    );
  } finally {
    console.timeEnd(label);
  }
}

export type { ChainTvl, Protocol };
