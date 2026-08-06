"use client";

import { ProfileTokenAndPrice } from "@/components/explorer/ProfileTokenAndPrice";
import { useLivePrice } from "@/lib/hooks/useLivePrice";
import type { Identity, Market, Trading, Tvl } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileTokenAndPriceLiveProps = {
  identity: Identity;
  market: Market;
  trading: Trading;
  tvl: Tvl;
  priceHistory: SparklinePoint[] | null;
  coingeckoId: string | null;
  /** PR-079 — passed straight through to `ProfileTokenAndPrice`'s TVL card, unresolved; this wrapper doesn't need to await it, only the live-price polling below is its concern. */
  tvlHistoryPromise: Promise<ProviderResult<SparklinePoint[]> | null>;
};

const POLL_MS = 90_000;

/**
 * Live-polling wrapper around `ProfileTokenAndPrice` (PR12.2) — mirrors
 * `MarketWidgetLive`'s relationship to `MarketWidget`: seeds from the
 * server-rendered `market`, then swaps in fresh CoinGecko data as
 * `useLivePrice` polls, reusing the exact same bulk
 * `coingecko.getBaseEcosystemMarkets(250)` call `sources.ts`'s
 * `matchMarket()` already made for this page's first paint — zero new
 * provider surface. Identity fields (symbol, image), the price chart, and
 * `genesisDate` (a separate, heavier per-coin endpoint fetched once, not
 * polled) stay exactly as the initial server render produced them;
 * everything else CoinGecko's bulk list carries — price, 24h/7d/30d
 * change, market cap, FDV, rank, supply, ATH/ATL — updates live.
 * `ProfileTokenAndPrice` itself is untouched and still directly usable
 * standalone; only this wrapper — and `page.tsx`'s one render call site —
 * are new.
 */
export function ProfileTokenAndPriceLive({
  identity,
  market,
  trading,
  tvl,
  priceHistory,
  coingeckoId,
  tvlHistoryPromise,
}: ProfileTokenAndPriceLiveProps) {
  const { price } = useLivePrice(
    coingeckoId,
    POLL_MS,
    market.available && market.priceUsd !== null
      ? {
          priceUsd: market.priceUsd,
          marketCapUsd: market.marketCapUsd,
          marketCapRank: market.marketCapRank,
          fullyDilutedValuationUsd: market.fullyDilutedValuationUsd,
          changePct24h: market.changePct24h,
          changePct7d: market.changePct7d,
          changePct30d: market.changePct30d,
          circulatingSupply: market.circulatingSupply,
          totalSupply: market.totalSupply,
          maxSupply: market.maxSupply,
          athUsd: market.athUsd,
          athDate: market.athDate,
          atlUsd: market.atlUsd,
          atlDate: market.atlDate,
        }
      : undefined
  );

  // PR-075 FINAL — `LivePrice` (`useLivePrice.ts`) deliberately excludes
  // `available`: it's not one of CoinGecko's bulk-list fields, it's this
  // app's own derived fact. Without setting it here, a real, reproducible
  // contradiction follows whenever the SSR-time fetch failed (`market.
  // available: false`, `priceUsd: null`) but the client poll then succeeds
  // (`price` present, real numbers) — this tile renders the live price
  // fine (it checks `priceUsd`, not `available`), but `liveMarket.available`
  // stays frozen at `false`, so anything downstream still reading
  // `available` (this project's own header badge included) keeps calling
  // it "No Live Market" next to a real, live price. Live price data is
  // itself proof the market is available, regardless of what the earlier
  // SSR snapshot said.
  const liveMarket: Market = price ? { ...market, ...price, available: true } : market;

  return (
    <ProfileTokenAndPrice
      identity={identity}
      market={liveMarket}
      trading={trading}
      tvl={tvl}
      priceHistory={priceHistory}
      coingeckoId={coingeckoId}
      tvlHistoryPromise={tvlHistoryPromise}
    />
  );
}
