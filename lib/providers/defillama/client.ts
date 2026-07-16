/**
 * DefiLlama — free, no API key required.
 * https://defillama.com/docs/api
 */

import { fetchJson } from "@/lib/providers/common/utilities";

export type RawHistoricalTvlPoint = { date: number; tvl: number };

export type RawStablecoinChartPoint = { totalCirculatingUSD?: Record<string, number> };

export type RawLlamaProtocol = {
  name: string;
  symbol: string;
  chains: string[];
  chainTvls?: Record<string, number>;
  tvl: number;
  mcap: number | null;
  change_1d: number | null;
  category?: string;
};

export async function fetchHistoricalChainTvl(chain: string): Promise<RawHistoricalTvlPoint[]> {
  return fetchJson<RawHistoricalTvlPoint[]>("defillama", `https://api.llama.fi/v2/historicalChainTvl/${chain}`);
}

export async function fetchStablecoinChart(chain: string): Promise<RawStablecoinChartPoint[]> {
  return fetchJson<RawStablecoinChartPoint[]>(
    "defillama",
    `https://stablecoins.llama.fi/stablecoincharts/${chain}`
  );
}

/**
 * The full protocol list is a multi-megabyte payload — there is no
 * per-chain endpoint, so every caller fetches the same list and filters
 * client-side (see `mapper.ts`). `common/cache.ts` caches the mapped,
 * filtered result, not this raw response, keeping what's held in memory
 * small.
 */
export async function fetchAllProtocols(): Promise<RawLlamaProtocol[]> {
  return fetchJson<RawLlamaProtocol[]>("defillama", "https://api.llama.fi/protocols");
}

export type RawProtocolTvlPoint = { date: number; totalLiquidityUSD: number };

/** The per-protocol detail endpoint's shape is distinct from `/protocols`' list-entry shape above (real per-date TVL series here, not a single current number). */
export type RawProtocolDetail = {
  tvl?: RawProtocolTvlPoint[];
  chainTvls?: Record<string, { tvl: RawProtocolTvlPoint[] }>;
};

/**
 * For the Project Profile's TVL chart (PR11) — real historical TVL for one
 * protocol, not the whole chain. For long-running, multi-chain protocols
 * (Uniswap, Curve, ...) this endpoint returns years of daily history and has
 * been observed taking 8-25s to respond. That's no longer a page-blocking
 * concern (the Project Profile page fetches this off the critical render
 * path and streams it in via `Suspense` — see `ProfileTvlChartAsync`/
 * `ProfileTvlChangeTilesAsync`), so this uses the shared default
 * timeout/retry budget rather than a tightened one: a real, slow-but-
 * eventually-successful response now gets its full chance to arrive instead
 * of being cut short for no remaining benefit.
 */
export async function fetchProtocolTvlHistory(slug: string): Promise<RawProtocolDetail> {
  return fetchJson<RawProtocolDetail>("defillama", `https://api.llama.fi/protocol/${slug}`);
}
