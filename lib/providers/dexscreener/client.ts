/**
 * DexScreener public API — free, no key required.
 * https://docs.dexscreener.com/api/reference
 */

import { fetchJson } from "@/lib/providers/common/utilities";

export type RawDexScreenerPair = {
  chainId: string;
  dexId: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  priceChange?: { h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  txns?: { h24?: { buys: number; sells: number } };
  pairCreatedAt?: number;
};

type RawSearchResponse = {
  pairs: RawDexScreenerPair[] | null;
};

export async function fetchSearchPairs(query: string): Promise<RawSearchResponse> {
  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
  return fetchJson<RawSearchResponse>("dexscreener", url);
}
