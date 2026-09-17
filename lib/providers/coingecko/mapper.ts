/** Raw CoinGecko responses → domain models. Pure functions, no I/O. */

import type { RawCoinContractDetail, RawCoinContractMarket, RawCoinDetail, RawCoinGeckoMarket, RawMarketChartRange, RawSimplePrice } from "@/lib/providers/coingecko/client";
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

/**
 * PR-098.02 — CoinGecko's docs assert `price_change_percentage_24h` is
 * always a finite number when present, but a raw provider response should
 * never be trusted blindly (a malformed/truncated response, or a field
 * CoinGecko itself is glitching on, could hand back `NaN`/`Infinity` after
 * JSON parsing in edge cases). Guards `changePct24h` specifically — the
 * one field PR-098.02 audited end-to-end — rather than every numeric field
 * on this type, to keep this a targeted fix, not a silent behavior change
 * across every other consumer of `CoinMarket`.
 */
function toFiniteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

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
    // PR-098.02 — this is THE project's own token's real USD price change
    // over the last 24 hours, straight from CoinGecko's own
    // `price_change_percentage_24h`. Never substitute TVL change
    // (DefiLlama's `Protocol.changePct24h`, a structurally different field
    // on a different type — see `defillama/mapper.ts`), volume change, or
    // any other metric here.
    changePct24h: toFiniteOrNull(raw.price_change_percentage_24h),
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

/** `null` when CoinGecko has no genesis date on record for this coin (common for tokens without a fixed "launch" event) — never guessed. */
export function mapGenesisDate(raw: RawCoinDetail): string | null {
  return raw.genesis_date ?? null;
}

/** Token Logo System — the largest real image CoinGecko has for this contract, falling back to `small` if `large` is missing; `null` when the response has no usable image at all (a malformed/unexpected shape, not just "field absent" — contained here rather than thrown, matching this file's existing error-containment style). */
export function mapContractImageUrl(raw: RawCoinContractDetail): string | null {
  return raw.image?.large || raw.image?.small || null;
}

/** V3-WALLET-002 — real USD price for a token resolved by contract address, `null` when CoinGecko has no market data for it (never fabricated). */
export function mapContractPrice(raw: RawCoinContractMarket): number | null {
  return raw.market_data?.current_price?.usd ?? null;
}

/** Real historical price series for a given period — `null` when the coin has no chart data at all (never a fabricated flat line). */
export function mapMarketChart(raw: RawMarketChartRange): SparklinePoint[] | null {
  if (!raw.prices || raw.prices.length === 0) return null;
  return raw.prices.map(([t, v]) => ({ t, v }));
}

/** Real historical volume series for the same period — PR13.7 Goal 9, reads the same `market_chart` response `mapMarketChart` already unwraps, no new request. `null` when CoinGecko returned no volume series for this coin. */
export function mapMarketVolumeSeries(raw: RawMarketChartRange): SparklinePoint[] | null {
  if (!raw.total_volumes || raw.total_volumes.length === 0) return null;
  return raw.total_volumes.map(([t, v]) => ({ t, v }));
}
