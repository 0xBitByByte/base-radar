/** Raw DefiLlama responses → domain models. Pure functions, no I/O. */

import type {
  RawHistoricalTvlPoint,
  RawLlamaProtocol,
  RawProtocolDetail,
  RawStablecoinChartPoint,
} from "@/lib/providers/defillama/client";
import type { SparklinePoint } from "@/lib/data/types";

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

/**
 * Prefers the protocol's Base-chain-specific TVL series (`chainTvls[chain]`)
 * over its all-chains total (`tvl`) when available — most Base ecosystem
 * projects are single-chain anyway, but for a multi-chain protocol the
 * Base-specific series is the honest one to show on a Base-focused profile.
 * `null` when the protocol has no real history for this chain at all
 * (never fabricated as a flat/empty line).
 */
export function mapProtocolTvlHistory(raw: RawProtocolDetail, chain: string): SparklinePoint[] | null {
  const points = raw.chainTvls?.[chain]?.tvl ?? raw.tvl;
  if (!points || points.length === 0) return null;
  return points.map((point) => ({ t: point.date, v: point.totalLiquidityUSD }));
}
