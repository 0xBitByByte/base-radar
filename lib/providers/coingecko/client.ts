/**
 * CoinGecko public API. Works keyless, but CoinGecko's currently documented
 * free tier (100 req/min, 10,000 req/month) requires a Demo API key sent as
 * the `x-cg-demo-api-key` header — same root URL either way
 * (`api.coingecko.com/api/v3`, never `pro-api.coingecko.com`). `COINGECKO_API_KEY`
 * is read once at module load, same pattern as `github/client.ts`'s
 * `GITHUB_TOKEN`; when unset, every call here behaves exactly as before
 * (keyless).
 * https://docs.coingecko.com/reference/setting-up-your-api-key
 */

import { fetchJson } from "@/lib/providers/common/utilities";

const BASE_URL = "https://api.coingecko.com/api/v3";

const HEADERS: Record<string, string> = process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {};

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
  return fetchJson<RawCoinGeckoMarket[]>("coingecko", url, { headers: HEADERS });
}

/**
 * PR-072 — same `/coins/markets` shape as the category-based bulk fetch
 * above, filtered by explicit `ids` instead of `category=base-ecosystem`.
 * Exists because CoinGecko's own Base-ecosystem category tagging is
 * incomplete for real registry projects (e.g. Uniswap's UNI is categorized
 * as an Ethereum-ecosystem asset there, even though the protocol is
 * deployed on Base) — a project can have a perfectly valid, configured
 * `providerIds.coingeckoId` and still never appear in the category list.
 * Called once per fetch cycle with every registry project's `coingeckoId`
 * batched into one request (see `sources.ts`'s `collectRegistryCoingeckoIds`),
 * not once per project.
 */
export async function fetchMarketsByIds(ids: string[]): Promise<RawCoinGeckoMarket[]> {
  const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d,30d`;
  return fetchJson<RawCoinGeckoMarket[]>("coingecko", url, { headers: HEADERS });
}

export async function fetchSimplePrice(ids: string[]): Promise<RawSimplePrice> {
  const url = `${BASE_URL}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
  return fetchJson<RawSimplePrice>("coingecko", url, { headers: HEADERS });
}

/** Genesis/launch date only — the rest of `/coins/{id}`'s (large) payload isn't needed here. */
export async function fetchCoinDetail(id: string): Promise<RawCoinDetail> {
  const url = `${BASE_URL}/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
  return fetchJson<RawCoinDetail>("coingecko", url, { headers: HEADERS });
}

/** Token Logo System — `/coins/{id}/contract/{contract_address}`'s response shape, trimmed to the one field this app reads: the coin's real image, at three sizes. Same shape CoinGecko returns from `/coins/{id}` itself. */
export type RawCoinContractDetail = {
  image?: { thumb?: string; small?: string; large?: string };
};

/**
 * Token Logo System — resolves a token's real CoinGecko listing (and thus
 * its real image) directly by on-chain contract address, for tokens this
 * app has no other identifier for (e.g. a pool's quote/secondary token,
 * which never has a registry-configured `providerIds.coingeckoId`). Unlike
 * `fetchMarketsByIds`, not batchable — CoinGecko's contract endpoint takes
 * one address per call — so callers should dedupe to unique addresses and
 * lean on the service layer's cache rather than calling this per pool card.
 * `platformId` is CoinGecko's asset-platform id, `"base"` for every address
 * this app resolves (all trading pools here are Base-chain).
 */
export async function fetchCoinByContractAddress(platformId: string, address: string): Promise<RawCoinContractDetail> {
  const url = `${BASE_URL}/coins/${platformId}/contract/${address}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
  return fetchJson<RawCoinContractDetail>("coingecko", url, { headers: HEADERS });
}

/**
 * V3-WALLET-002 — same `/coins/{id}/contract/{address}` endpoint
 * `fetchCoinByContractAddress` already uses for logos, but with
 * `market_data=true` instead of `false`: the portfolio pricing fallback
 * needs a token's real USD price, which that lighter call deliberately
 * excludes to keep its own (much more frequent, per-pool-card) payload
 * small. Kept as its own function rather than widening the existing one, so
 * every other caller of `fetchCoinByContractAddress` keeps its smaller
 * response and doesn't start paying for market data it never reads.
 */
export type RawCoinContractMarket = {
  image?: { thumb?: string; small?: string; large?: string };
  market_data?: { current_price?: { usd?: number } };
};

export async function fetchCoinMarketByContractAddress(platformId: string, address: string): Promise<RawCoinContractMarket> {
  const url = `${BASE_URL}/coins/${platformId}/contract/${address}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
  return fetchJson<RawCoinContractMarket>("coingecko", url, { headers: HEADERS });
}

export type RawMarketChartRange = {
  prices: [number, number][];
  /** PR13.7 Goal 9 — same `market_chart` response already fetched for the Price chart; CoinGecko always includes this volume series alongside `prices`, it just wasn't declared/read before. */
  total_volumes?: [number, number][];
};

/** Historical price series for the Price chart's period filters (24H/7D/30D/90D/1Y/ALL) — the free `market_chart` endpoint, same provider, no key required. */
export async function fetchMarketChart(id: string, days: number | "max"): Promise<RawMarketChartRange> {
  const url = `${BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  return fetchJson<RawMarketChartRange>("coingecko", url, { headers: HEADERS });
}
