import type {
  RawHistoricalTvlPoint,
  RawLlamaProtocol,
  RawStablecoinChartPoint,
} from "@/lib/providers/defillama/client";

export type ChainTvl = {
  tvlUsd: number;
  changePct24h: number;
};

export type Protocol = {
  name: string;
  symbol: string;
  chains: string[];
  tvlUsd: number;
  marketCapUsd: number | null;
  changePct24h: number | null;
  category: string | null;
};

// Centralized exchanges and bridges show up in DefiLlama's protocol list
// with large "TVL" from custody balances, but they aren't ecosystem
// projects — excluding them keeps project counts and top-protocol lookups
// honest.
const EXCLUDED_CATEGORIES = new Set(["CEX", "Chain"]);

export function mapChainTvl(points: RawHistoricalTvlPoint[]): ChainTvl | null {
  if (!points.length) return null;
  const latest = points[points.length - 1];
  const prev = points[Math.max(0, points.length - 2)];
  const changePct24h = prev.tvl > 0 ? ((latest.tvl - prev.tvl) / prev.tvl) * 100 : 0;
  return { tvlUsd: latest.tvl, changePct24h };
}

export function mapStablecoinMcap(points: RawStablecoinChartPoint[]): number | null {
  if (!points.length) return null;
  const latest = points[points.length - 1];
  const values = Object.values(latest.totalCirculatingUSD ?? {});
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0);
}

export function mapProtocol(raw: RawLlamaProtocol): Protocol {
  return {
    name: raw.name,
    symbol: raw.symbol,
    chains: raw.chains,
    tvlUsd: raw.tvl,
    marketCapUsd: raw.mcap,
    changePct24h: raw.change_1d,
    category: raw.category ?? null,
  };
}

/** Filters to a given chain, excludes non-ecosystem categories, sorts by TVL descending. */
export function mapChainProtocols(raw: RawLlamaProtocol[], chain: string): Protocol[] {
  return raw
    .filter(
      (p) => p.chains?.includes(chain) && p.tvl > 0 && !(p.category && EXCLUDED_CATEGORIES.has(p.category))
    )
    .map(mapProtocol)
    .sort((a, b) => b.tvlUsd - a.tvlUsd);
}
