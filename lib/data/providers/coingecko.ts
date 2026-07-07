/**
 * CoinGecko public API — free tier, no key required.
 * https://www.coingecko.com/en/api/documentation
 */

const REVALIDATE_SECONDS = 90;
const BASE_URL = "https://api.coingecko.com/api/v3";

export type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}

export async function getEthPrice(): Promise<{ usd: number; changePct24h: number } | null> {
  try {
    const data = await fetchJson<{
      ethereum: { usd: number; usd_24h_change: number };
    }>(`${BASE_URL}/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`);
    return { usd: data.ethereum.usd, changePct24h: data.ethereum.usd_24h_change };
  } catch {
    return null;
  }
}

export type MajorPrices = {
  eth: { usd: number; changePct24h: number };
  btc: { usd: number; changePct24h: number };
};

export async function getMajorPrices(): Promise<MajorPrices | null> {
  try {
    const data = await fetchJson<{
      ethereum: { usd: number; usd_24h_change: number };
      bitcoin: { usd: number; usd_24h_change: number };
    }>(
      `${BASE_URL}/simple/price?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true`
    );
    return {
      eth: { usd: data.ethereum.usd, changePct24h: data.ethereum.usd_24h_change },
      btc: { usd: data.bitcoin.usd, changePct24h: data.bitcoin.usd_24h_change },
    };
  } catch {
    return null;
  }
}

export async function getBaseEcosystemMarkets(
  perPage = 20
): Promise<CoinGeckoMarket[] | null> {
  try {
    return await fetchJson<CoinGeckoMarket[]>(
      `${BASE_URL}/coins/markets?vs_currency=usd&category=base-ecosystem&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h`
    );
  } catch {
    return null;
  }
}
