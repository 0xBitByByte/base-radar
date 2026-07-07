/**
 * DexScreener public API — free, no key required.
 * https://docs.dexscreener.com/api/reference
 */

const REVALIDATE_SECONDS = 60;

export type DexScreenerPair = {
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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`DexScreener request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function getBaseTrendingPairs(): Promise<DexScreenerPair[] | null> {
  try {
    const data = await fetchJson<{ pairs: DexScreenerPair[] | null }>(
      "https://api.dexscreener.com/latest/dex/search?q=base"
    );
    const pairs = (data.pairs ?? []).filter((p) => p.chainId === "base");
    return pairs.sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));
  } catch {
    return null;
  }
}
