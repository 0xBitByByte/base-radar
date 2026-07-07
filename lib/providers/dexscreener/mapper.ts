import type { RawDexScreenerPair } from "@/lib/providers/dexscreener/client";

export type Pair = {
  chainId: string;
  dexId: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: number;
  priceChangePct24h: number | null;
  volume24hUsd: number | null;
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
    priceUsd: Number(raw.priceUsd),
    priceChangePct24h: raw.priceChange?.h24 ?? null,
    volume24hUsd: raw.volume?.h24 ?? null,
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
