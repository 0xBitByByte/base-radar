/**
 * DexScreener public API — free, no key required.
 * https://docs.dexscreener.com/api/reference
 */

import { fetchJson } from "@/lib/providers/common/utilities";

export type RawDexScreenerPair = {
  chainId: string;
  dexId: string;
  baseToken: { address: string; name: string; symbol: string };
  /** PR-084 — present on the live response alongside `baseToken`, just not previously typed/consumed here. */
  quoteToken?: { address: string; name: string; symbol: string };
  /** PR-084.01 — the pool's own on-chain contract address, live-verified present on `/latest/dex/tokens/{address}` (`curl` against Aave's real Base address returned it on every one of 22 real pairs). Distinct from `baseToken.address`/`quoteToken.address` — this is the pair/pool contract itself. */
  pairAddress?: string;
  /** PR-084.01 — the pair's real DexScreener page, live-verified present alongside `pairAddress`. */
  url?: string;
  priceUsd: string;
  priceChange?: { h24?: number };
  /** PR-084.02 — `h6` added alongside the existing `h24`, live-verified present on the same response (`curl` against Aave's real Base address). Powers the Pool Curation Engine's Trending category — a single 24h total can't show whether a pool is accelerating, but comparing 6h pace to 24h average pace can. */
  volume?: { h24?: number; h6?: number };
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
 *
 * PR-074 REVIEW — kept only for callers that look up a single address at a
 * time (where it correctly returns every pair across every DEX for that
 * token). Confirmed via a live request during this review that this
 * *legacy* `/latest/dex/tokens/{addresses}` endpoint caps its response at a
 * total of 30 pairs shared across every address in a multi-address request —
 * not 30-per-address. Querying it with the registry's 12 real Base token
 * addresses returned pairs for only 6 of them; Aave's own address (which
 * alone has 22 real pairs) was entirely absent from the response, even
 * though it has genuine, substantial on-chain liquidity — this was the
 * confirmed root cause of the Project Profile page showing "Liquidity: Not
 * Tracked" for Aave. Multi-address batch lookups now use
 * `fetchTokenPairsV1`, which does not truncate across addresses.
 */
export async function fetchPairsByTokenAddresses(addresses: string[]): Promise<RawSearchResponse> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${addresses.join(",")}`;
  return fetchJson<RawSearchResponse>("dexscreener", url);
}

/**
 * PR-074 REVIEW — the correct batch endpoint for looking up many token
 * addresses on one chain at once: `/tokens/v1/{chainId}/{addresses}` (also
 * capped at 30 comma-separated addresses, same as the legacy endpoint, but
 * verified live to return real data for every valid address in the batch,
 * not just the first several). Trade-off, confirmed live: it returns one
 * pair per address (the most relevant one) rather than every pair across
 * every DEX the way a single-address `fetchPairsByTokenAddresses` call
 * does — an honest, correct "primary pair" liquidity/volume figure for
 * every token, rather than a richer-but-broken batch result that silently
 * drops some tokens entirely.
 */
export async function fetchTokenPairsV1(chainId: string, addresses: string[]): Promise<RawDexScreenerPair[]> {
  const url = `https://api.dexscreener.com/tokens/v1/${chainId}/${addresses.join(",")}`;
  return fetchJson<RawDexScreenerPair[]>("dexscreener", url);
}
