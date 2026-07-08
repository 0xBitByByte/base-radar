/**
 * CoinGecko public API — free tier, no key required.
 * https://www.coingecko.com/en/api/documentation
 */

import { fetchJson } from "@/lib/providers/common/utilities";

const BASE_URL = "https://api.coingecko.com/api/v3";

export type RawCoinGeckoMarket = {
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

export type RawSimplePrice = Record<string, { usd: number; usd_24h_change: number }>;

export async function fetchBaseEcosystemMarkets(perPage: number): Promise<RawCoinGeckoMarket[]> {
  const url = `${BASE_URL}/coins/markets?vs_currency=usd&category=base-ecosystem&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h`;
  return fetchJson<RawCoinGeckoMarket[]>("coingecko", url);
}

export async function fetchSimplePrice(ids: string[]): Promise<RawSimplePrice> {
  const url = `${BASE_URL}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  return fetchJson<RawSimplePrice>("coingecko", url);
}
