/** Raw CoinGecko responses → domain models. Pure functions, no I/O. */

import type { RawCoinDetail, RawCoinGeckoMarket, RawMarketChartRange, RawSimplePrice } from "@/lib/providers/coingecko/client";
import type { SparklinePoint } from "@/lib/data/types";

export type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  priceUsd: number;
  marketCapUsd: number;
  marketCapRank: number | null;
  fullyDilutedValuationUsd: number | null;
  volume24hUsd: number;
  changePct24h: number | null;
  changePct7d: number | null;
  changePct30d: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
  athUsd: number | null;
  athDate: string | null;
  atlUsd: number | null;
  atlDate: string | null;
  sparkline7d: number[];
};

export type AssetPrice = {
  usd: number;
  changePct24h: number;
};

export type MajorPrices = {
  eth: AssetPrice;
  btc: AssetPrice;
};

export function mapCoinMarket(raw: RawCoinGeckoMarket): CoinMarket {
  return {
    id: raw.id,
    symbol: raw.symbol.toUpperCase(),
    name: raw.name,
    imageUrl: raw.image,
    priceUsd: raw.current_price,
    marketCapUsd: raw.market_cap,
    marketCapRank: raw.market_cap_rank ?? null,
    fullyDilutedValuationUsd: raw.fully_diluted_valuation,
    volume24hUsd: raw.total_volume,
    changePct24h: raw.price_change_percentage_24h,
    changePct7d: raw.price_change_percentage_7d_in_currency ?? null,
    changePct30d: raw.price_change_percentage_30d_in_currency ?? null,
    circulatingSupply: raw.circulating_supply ?? null,
    totalSupply: raw.total_supply ?? null,
    maxSupply: raw.max_supply ?? null,
    athUsd: raw.ath ?? null,
    athDate: raw.ath_date ?? null,
    atlUsd: raw.atl ?? null,
    atlDate: raw.atl_date ?? null,
    sparkline7d: raw.sparkline_in_7d?.price ?? [],
  };
}

export function mapCoinMarkets(raw: RawCoinGeckoMarket[]): CoinMarket[] {
  return raw.map(mapCoinMarket);
}

export function mapMajorPrices(raw: RawSimplePrice): MajorPrices | null {
  const eth = raw.ethereum;
  const btc = raw.bitcoin;
  if (!eth || !btc) return null;
  return {
    eth: { usd: eth.usd, changePct24h: eth.usd_24h_change },
    btc: { usd: btc.usd, changePct24h: btc.usd_24h_change },
  };
}

export function mapAssetPrice(raw: RawSimplePrice, id: string): AssetPrice | null {
  const entry = raw[id];
  if (!entry) return null;
  return { usd: entry.usd, changePct24h: entry.usd_24h_change };
}

/** `null` when CoinGecko has no genesis date on record for this coin (common for tokens without a fixed "launch" event) — never guessed. */
export function mapGenesisDate(raw: RawCoinDetail): string | null {
  return raw.genesis_date ?? null;
}

/** Real historical price series for a given period — `null` when the coin has no chart data at all (never a fabricated flat line). */
export function mapMarketChart(raw: RawMarketChartRange): SparklinePoint[] | null {
  if (!raw.prices || raw.prices.length === 0) return null;
  return raw.prices.map(([t, v]) => ({ t, v }));
}
