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
  market_cap_rank: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
  sparkline_in_7d?: { price: number[] };
};

export type RawSimplePrice = Record<string, { usd: number; usd_24h_change: number }>;

/** One field CoinGecko's `/coins/markets` doesn't return: genesis date. `/coins/{id}` is a heavier, per-coin endpoint — only worth the extra request on the Project Profile page, never in the bulk ecosystem list. */
export type RawCoinDetail = {
  genesis_date: string | null;
};

export async function fetchBaseEcosystemMarkets(perPage: number): Promise<RawCoinGeckoMarket[]> {
  const url = `${BASE_URL}/coins/markets?vs_currency=usd&category=base-ecosystem&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h,7d,30d`;
  return fetchJson<RawCoinGeckoMarket[]>("coingecko", url);
}

export async function fetchSimplePrice(ids: string[]): Promise<RawSimplePrice> {
  const url = `${BASE_URL}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  return fetchJson<RawSimplePrice>("coingecko", url);
}

/** Genesis/launch date only — the rest of `/coins/{id}`'s (large) payload isn't needed here. */
export async function fetchCoinDetail(id: string): Promise<RawCoinDetail> {
  const url = `${BASE_URL}/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
  return fetchJson<RawCoinDetail>("coingecko", url);
}

export type RawMarketChartRange = {
  prices: [number, number][];
};

/** Historical price series for the Price chart's period filters (24H/7D/30D/90D/1Y/ALL) — the free `market_chart` endpoint, same provider, no key required. */
export async function fetchMarketChart(id: string, days: number | "max"): Promise<RawMarketChartRange> {
  const url = `${BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  return fetchJson<RawMarketChartRange>("coingecko", url);
}
