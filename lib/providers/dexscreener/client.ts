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

/**
 * Direct lookup by token contract address — up to 30 comma-separated
 * addresses per call, free, no key. Unlike `fetchSearchPairs` (a keyword
 * search over currently-trending pairs), this resolves a specific, stable
 * token address regardless of whether its pair is "trending" right now —
 * see docs/PROVIDER_DATA_COVERAGE_AUDIT.md §5.2 for the limitation this
 * fixes.
 */
export async function fetchPairsByTokenAddresses(addresses: string[]): Promise<RawSearchResponse> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(",")}`;
  return fetchJson<RawSearchResponse>("dexscreener", url);
}
