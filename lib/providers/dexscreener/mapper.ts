/** Raw DexScreener responses → domain models. Pure functions, no I/O. */

import type { RawDexScreenerPair } from "@/lib/providers/dexscreener/client";

export type Pair = {
  chainId: string;
  dexId: string;
  baseToken: { address: string; name: string; symbol: string };
  /** PR-084 — the pool's quote-side token symbol, e.g. `"USDC"`; `null` when DexScreener didn't return one for this pair. */
  quoteTokenSymbol: string | null;
  /** Token Logo System — the quote token's own on-chain contract address, present on the raw response alongside its symbol but previously discarded here. Distinct from `baseToken.address`; `null` when DexScreener didn't return a quote token for this pair. Powers address-first token logo resolution — the most collision-safe way to look up a token's real logo. */
  quoteTokenAddress: string | null;
  /** PR-084.01 — the pool's own on-chain contract address; `null` when DexScreener didn't return one for this pair. */
  pairAddress: string | null;
  /** PR-084.01 — the pair's real DexScreener page URL; `null` when unavailable. */
  url: string | null;
  priceUsd: number;
  priceChangePct24h: number | null;
  volume24hUsd: number | null;
  /** PR-084.02 — 6-hour volume window, for the Pool Curation Engine's Trending category; `null` when unavailable. */
  volume6hUsd: number | null;
  liquidityUsd: number | null;
  buys24h: number | null;
  sells24h: number | null;
  pairCreatedAt: number | null;
};

export function mapPair(raw: RawDexScreenerPair): Pair {
  return {
    chainId: raw.chainId,
    dexId: raw.dexId,
    baseToken: raw.baseToken,
    quoteTokenSymbol: raw.quoteToken?.symbol ?? null,
    quoteTokenAddress: raw.quoteToken?.address ?? null,
    pairAddress: raw.pairAddress ?? null,
    url: raw.url ?? null,
    priceUsd: Number(raw.priceUsd),
    priceChangePct24h: raw.priceChange?.h24 ?? null,
    volume24hUsd: raw.volume?.h24 ?? null,
    volume6hUsd: raw.volume?.h6 ?? null,
    liquidityUsd: raw.liquidity?.usd ?? null,
    buys24h: raw.txns?.h24?.buys ?? null,
    sells24h: raw.txns?.h24?.sells ?? null,
    pairCreatedAt: raw.pairCreatedAt ?? null,
  };
}

/** Filters to Base-chain pairs and sorts by 24h volume, descending. */
export function mapBasePairs(rawPairs: RawDexScreenerPair[] | null): Pair[] {
  const pairs = (rawPairs ?? []).filter((p) => p.chainId === "base").map(mapPair);
  return pairs.sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0));
}

/**
 * Every pair returned for a set of looked-up token addresses, across
 * whichever chains DexScreener has them on — deliberately not filtered to
 * Base here (unlike `mapBasePairs`), since a token-address lookup can
 * legitimately return pairs on other chains too. Callers filter by each
 * project's own `chainId` (see `matchTrading`, `lib/intelligence/sources.ts`).
 */
export function mapTokenPairs(rawPairs: RawDexScreenerPair[] | null): Pair[] {
  return (rawPairs ?? []).map(mapPair);
}
