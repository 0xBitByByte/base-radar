"use client";

/**
 * Client-poll refresh for a single project's numeric market stats on the
 * Project Profile page (PR12.2) — same "UI -> Hooks -> Services ->
 * Providers" shape as `useLiveNetworkStatus`/`useLiveTvl`, built on
 * `usePolling`. Each poll calls `pollLivePrice` (`lib/hooks/liveActions.ts`),
 * a Server Action wrapping CoinGecko's bulk `getBaseEcosystemMarkets(250)`
 * (the same call `sources.ts`'s `matchMarket()` already makes for this
 * page's first paint) and matching by `id === coingeckoId`, exactly like
 * `matchMarket` does — run server-side (Final Production Readiness PR),
 * not imported into this `"use client"` hook directly: CoinGecko's REST API
 * doesn't permit cross-origin browser requests, so the previous direct
 * import meant every poll failed silently in the browser (confirmed live
 * via a CORS console error) and this page's live price never actually
 * refreshed past its first SSR paint.
 *
 * Scoped to the fields CoinGecko's bulk list actually carries and this page
 * treats as "live market data" — price, market cap/rank/FDV, 24h/7d/30d
 * change, supply, ATH/ATL. Identity fields (symbol, image) and
 * `genesisDate` (only available via a separate, heavier per-coin endpoint
 * fetched once, not polled) are deliberately excluded — a caller merges
 * this onto its existing `Market` object rather than replacing it.
 */

import { pollLivePrice } from "@/lib/hooks/liveActions";
import { usePolling } from "@/lib/hooks/usePolling";
import type { Market } from "@/lib/intelligence/types";

// `Pick<Market, ...>`, not `Pick<CoinMarket, ...>` — every field here is
// nullable to match the `Market` shape a caller merges this onto (a
// `CoinMarket` match's non-nullable fields, e.g. `marketCapUsd: number`,
// are always assignable into that nullable target).
export type LivePrice = Pick<
  Market,
  | "priceUsd"
  | "marketCapUsd"
  | "marketCapRank"
  | "fullyDilutedValuationUsd"
  | "changePct24h"
  | "changePct7d"
  | "changePct30d"
  | "circulatingSupply"
  | "totalSupply"
  | "maxSupply"
  | "athUsd"
  | "athDate"
  | "atlUsd"
  | "atlDate"
>;

const DEFAULT_POLL_MS = 90_000;

export function useLivePrice(coingeckoId: string | null, pollMs: number = DEFAULT_POLL_MS, initial?: LivePrice) {
  const { data, updatedAt } = usePolling<LivePrice>(
    async () => {
      if (!coingeckoId) return null;
      const match = await pollLivePrice(coingeckoId);
      if (!match) return null;
      return {
        priceUsd: match.priceUsd,
        marketCapUsd: match.marketCapUsd,
        marketCapRank: match.marketCapRank,
        fullyDilutedValuationUsd: match.fullyDilutedValuationUsd,
        changePct24h: match.changePct24h,
        changePct7d: match.changePct7d,
        changePct30d: match.changePct30d,
        circulatingSupply: match.circulatingSupply,
        totalSupply: match.totalSupply,
        maxSupply: match.maxSupply,
        athUsd: match.athUsd,
        athDate: match.athDate,
        atlUsd: match.atlUsd,
        atlDate: match.atlDate,
      };
    },
    pollMs,
    { initial }
  );

  return { price: data, updatedAt };
}
