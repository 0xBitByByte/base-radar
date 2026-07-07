import { fetchAllProtocols, fetchHistoricalChainTvl, fetchStablecoinChart } from "@/lib/providers/defillama/client";
import { mapChainProtocols, mapChainTvl, mapStablecoinMcap, type ChainTvl, type Protocol } from "@/lib/providers/defillama/mapper";
import { getOrSet } from "@/lib/providers/common/cache";
import { ProviderParseError, ProviderRateLimitError, toProviderError } from "@/lib/providers/common/errors";
import { tryAcquire, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import type { ProviderResult } from "@/lib/providers/common/types";
import { nowIso } from "@/lib/providers/common/utilities";

const PROVIDER = "defillama" as const;
const CHAIN = "Base";
const CACHE_TTL_MS = 120_000; // matches the window documented in docs/API.md
const RATE_LIMIT: RateLimitConfig = { limit: 30, windowMs: 60_000 };

function guardRateLimit(): void {
  if (!tryAcquire(PROVIDER, RATE_LIMIT)) {
    throw new ProviderRateLimitError(PROVIDER);
  }
}

export async function getBaseChainTvl(): Promise<ProviderResult<ChainTvl>> {
  try {
    const data = await getOrSet(`${PROVIDER}:chain-tvl:${CHAIN}`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchHistoricalChainTvl(CHAIN);
      const mapped = mapChainTvl(raw);
      if (!mapped) throw new ProviderParseError(PROVIDER, "No historical TVL points returned");
      return mapped;
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export async function getBaseStablecoinMcap(): Promise<ProviderResult<number>> {
  try {
    const data = await getOrSet(`${PROVIDER}:stablecoin-mcap:${CHAIN}`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchStablecoinChart(CHAIN);
      const mapped = mapStablecoinMcap(raw);
      if (mapped === null) throw new ProviderParseError(PROVIDER, "No stablecoin market cap data returned");
      return mapped;
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export async function getBaseProtocols(): Promise<ProviderResult<Protocol[]>> {
  try {
    const data = await getOrSet(`${PROVIDER}:protocols:${CHAIN}`, CACHE_TTL_MS, async () => {
      guardRateLimit();
      const raw = await fetchAllProtocols();
      return mapChainProtocols(raw, CHAIN);
    });
    return { ok: true, data, source: PROVIDER, fetchedAt: nowIso() };
  } catch (err) {
    return { ok: false, source: PROVIDER, error: toProviderError(PROVIDER, err) };
  }
}

export async function getTopBaseProtocol(): Promise<ProviderResult<Protocol>> {
  const protocols = await getBaseProtocols();
  if (!protocols.ok) return protocols;
  const top = protocols.data[0];
  if (!top) {
    return { ok: false, source: PROVIDER, error: new ProviderParseError(PROVIDER, "No protocols found for chain") };
  }
  return { ok: true, data: top, source: PROVIDER, fetchedAt: nowIso() };
}

export async function getBaseProjectCount(): Promise<ProviderResult<number>> {
  const protocols = await getBaseProtocols();
  if (!protocols.ok) return protocols;
  return { ok: true, data: protocols.data.length, source: PROVIDER, fetchedAt: nowIso() };
}

export type { ChainTvl, Protocol };
