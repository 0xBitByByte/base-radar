import type { RawCoinGeckoMarket, RawSimplePrice } from "@/lib/providers/coingecko/client";

export type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  priceUsd: number;
  marketCapUsd: number;
  fullyDilutedValuationUsd: number | null;
  volume24hUsd: number;
  changePct24h: number | null;
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
    fullyDilutedValuationUsd: raw.fully_diluted_valuation,
    volume24hUsd: raw.total_volume,
    changePct24h: raw.price_change_percentage_24h,
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
