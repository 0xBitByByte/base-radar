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
  /**
   * PR-102 — this protocol's TOTAL, cross-chain TVL (DefiLlama's `tvl`
   * field). Renamed from the old unqualified `tvlUsd` for this exact
   * reason: it was previously the field every consumer read as "this
   * project's TVL," even though for a multi-chain protocol it's the WORLD
   * total, not its Base footprint (confirmed, e.g., Aave V3: ~$16.9B
   * global vs. ~$506M on Base — a 33x difference; Compound V3: ~$1.41B
   * global vs. ~$25M on Base, 56x). Kept as real, available secondary
   * context (never deleted) — never treated as Base Radar's canonical TVL.
   */
  globalTvlUsd: number;
  /**
   * PR-102 — this protocol's Base-chain-specific TVL, read directly from
   * DefiLlama's own real `chainTvls["Base"]` breakdown (already present on
   * the same bulk `/protocols` list response `globalTvlUsd` comes from —
   * no new endpoint, no new call). `null` when DefiLlama has no Base-
   * specific breakdown for this protocol at all — never silently
   * substituted with `globalTvlUsd` (that would misrepresent a global
   * protocol's worldwide balance sheet as its Base commitment, exactly the
   * V2 audit's Priority 6 finding). THIS is Base Radar's canonical TVL —
   * every live consumer (Radar Score's TVL dimension, Featured
   * Intelligence, Project Profile) should read this field, not
   * `globalTvlUsd`.
   */
  baseTvlUsd: number | null;
  marketCapUsd: number | null;
  changePct24h: number | null;
  category: string | null;
  /** PR-072 — real DefiLlama-hosted protocol logo, `null` when this protocol has none on record (never fabricated). */
  logoUrl: string | null;
  /** PR-074 DATA INTEGRITY AUDIT — real DefiLlama parent-grouping id (e.g. `"parent#uniswap"`), `null` when this entry isn't a tagged sub-protocol. See `sources.ts`'s `matchTvl`. */
  parentProtocol: string | null;
};

/** PR-102 — the exact chain key Base Radar's `chainTvls` breakdown reads, matching DefiLlama's own real string (verified live: `chainTvls.Base`, not `chainTvls.base` — case-sensitive). Also matches `mapProtocolTvlHistory`'s existing `chain` parameter convention below (already correctly Base-scoped, this file's one prior consumer that got it right). */
const BASE_CHAIN_KEY = "Base";

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
  const baseTvl = raw.chainTvls?.[BASE_CHAIN_KEY];
  return {
    name: raw.name,
    symbol: raw.symbol,
    chains: raw.chains,
    globalTvlUsd: raw.tvl,
    baseTvlUsd: typeof baseTvl === "number" && Number.isFinite(baseTvl) ? baseTvl : null,
    marketCapUsd: raw.mcap,
    changePct24h: raw.change_1d,
    category: raw.category ?? null,
    logoUrl: raw.logo ?? null,
    parentProtocol: raw.parentProtocol ?? null,
  };
}

/** Filters to a given chain, excludes non-ecosystem categories, sorts by TVL descending. PR-102 — the filter/sort still use `globalTvlUsd` (deciding WHICH protocols have any real presence on this chain, and roughly how prominent they are, is a fair use of the total figure); it's each entry's OWN `tvlUsd`-reading consumers downstream that must switch to `baseTvlUsd`. */
export function mapChainProtocols(raw: RawLlamaProtocol[], chain: string): Protocol[] {
  return raw
    .filter(
      (p) => p.chains?.includes(chain) && p.tvl > 0 && !(p.category && EXCLUDED_CATEGORIES.has(p.category))
    )
    .map(mapProtocol)
    .sort((a, b) => b.globalTvlUsd - a.globalTvlUsd);
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
