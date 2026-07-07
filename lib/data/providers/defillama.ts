/**
 * DefiLlama — free, no API key required.
 * https://defillama.com/docs/api
 */

const REVALIDATE_SECONDS = 120;

type HistoricalTvlPoint = { date: number; tvl: number };

export type LlamaProtocol = {
  name: string;
  symbol: string;
  chains: string[];
  chainTvls?: Record<string, number>;
  tvl: number;
  mcap: number | null;
  change_1d: number | null;
  category?: string;
};

// Centralized exchanges and bridges show up in DefiLlama's protocol list with
// large "TVL" from custody balances, but they aren't Base-native projects —
// excluding them keeps project counts and the top-protocol spotlight honest.
const EXCLUDED_CATEGORIES = new Set(["CEX", "Chain"]);

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`DefiLlama request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

// The /protocols payload is tens of megabytes — too large for Next's data
// cache, so it's fetched fresh every time instead of going through `next.revalidate`.
async function fetchJsonUncached<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`DefiLlama request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function getBaseChainTvl(): Promise<{ tvlUsd: number; changePct24h: number } | null> {
  try {
    const points = await fetchJson<HistoricalTvlPoint[]>(
      "https://api.llama.fi/v2/historicalChainTvl/Base"
    );
    if (!points.length) return null;
    const latest = points[points.length - 1];
    const prev = points[Math.max(0, points.length - 2)];
    const changePct24h = prev.tvl > 0 ? ((latest.tvl - prev.tvl) / prev.tvl) * 100 : 0;
    return { tvlUsd: latest.tvl, changePct24h };
  } catch {
    return null;
  }
}

export async function getBaseStablecoinMcap(): Promise<number | null> {
  try {
    const data = await fetchJson<{ totalCirculatingUSD?: Record<string, number> }[]>(
      "https://stablecoins.llama.fi/stablecoincharts/Base"
    );
    if (!data.length) return null;
    const latest = data[data.length - 1];
    const values = Object.values(latest.totalCirculatingUSD ?? {});
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0);
  } catch {
    return null;
  }
}

export async function getBaseProtocols(): Promise<LlamaProtocol[] | null> {
  try {
    const all = await fetchJsonUncached<LlamaProtocol[]>("https://api.llama.fi/protocols");
    const onBase = all.filter(
      (p) =>
        p.chains?.includes("Base") &&
        p.tvl > 0 &&
        !(p.category && EXCLUDED_CATEGORIES.has(p.category))
    );
    return onBase.sort((a, b) => b.tvl - a.tvl);
  } catch {
    return null;
  }
}

export async function getBaseProjectCount(): Promise<number | null> {
  const protocols = await getBaseProtocols();
  return protocols ? protocols.length : null;
}

export async function getTopBaseProtocol(): Promise<LlamaProtocol | null> {
  const protocols = await getBaseProtocols();
  return protocols?.[0] ?? null;
}
