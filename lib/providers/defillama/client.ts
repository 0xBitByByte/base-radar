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
