"use client";

import { ProfileTokenAndPrice } from "@/components/explorer/ProfileTokenAndPrice";
import { useLivePrice } from "@/lib/hooks/useLivePrice";
import type { ChainInfo, Contracts, Identity, Market, Trading } from "@/lib/intelligence/types";
import type { SparklinePoint } from "@/lib/data/types";

type ProfileTokenAndPriceLiveProps = {
  identity: Identity;
  market: Market;
  trading: Trading;
  contracts: Contracts;
  chain: ChainInfo;
  priceHistory: SparklinePoint[] | null;
  coingeckoId: string | null;
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
  contracts,
  chain,
  priceHistory,
  coingeckoId,
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

  const liveMarket: Market = price ? { ...market, ...price } : market;

  return (
    <ProfileTokenAndPrice
      identity={identity}
      market={liveMarket}
      trading={trading}
      contracts={contracts}
      chain={chain}
      priceHistory={priceHistory}
      coingeckoId={coingeckoId}
    />
  );
}
