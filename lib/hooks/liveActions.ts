"use server";

/**
 * Final Production Readiness PR — thin Server Action wrappers around the
 * Provider Layer, the same pattern `app/dashboard/projects/[slug]/actions.ts`
 * already establishes for the Price chart period picker ("a Server Action
 * rather than a new API route or provider — a thin RPC wrapper around the
 * same cache-/rate-limit-guarded provider service every other call in this
 * codebase goes through").
 *
 * `useLiveTicker`/`useLivePrice`/`useLiveTvl` previously imported
 * `lib/providers` service modules directly — fine for a Server Component, but
 * these are `"use client"` polling hooks, so that import pulled the
 * provider layer (and its `fetch()` calls) into the *client* bundle. Every
 * poll then ran as a browser-origin request straight to CoinGecko's/
 * DefiLlama's/Blockscout's REST APIs, none of which send CORS headers
 * permitting that — confirmed live: every poll silently failed in the
 * browser console (`Access to fetch ... has been blocked by CORS policy`),
 * so ETH/BTC price, chain TVL, transaction count, a project's live price,
 * and a project's live TVL never actually refreshed after the initial SSR
 * paint, for any real user, ever. (Base's own public RPC — `baseRpc.
 * getBaseNetworkStatus`, block height/gas — genuinely is CORS-open, the
 * same way a dApp's wallet library calls it directly; that's the one
 * `useLiveTicker` field that really was refreshing.) Routing every other
 * provider call through a Server Action fixes this the same way the
 * existing Price-chart action already does: the fetch runs on the server,
 * where these providers' own CORS restrictions don't apply, and the
 * client only ever receives plain JSON.
 */

import { getBaseNetworkStatus, type NetworkStatus } from "@/lib/providers/base/service";
import { getMajorPrices, getBaseEcosystemMarkets, type MajorPrices, type CoinMarket } from "@/lib/providers/coingecko/service";
import { getBaseChainTvl, getBaseProtocols, type ChainTvl } from "@/lib/providers/defillama/service";
import { getChainStats, type ChainStats } from "@/lib/providers/blockscout/service";
import { slugify } from "@/lib/intelligence/helpers";

export type LiveTickerPoll = {
  net: NetworkStatus | null;
  prices: MajorPrices | null;
  tvl: ChainTvl | null;
  chainStats: ChainStats | null;
};

/** `useLiveTicker`'s poll — same four providers, same `Promise.allSettled`, now run server-side. */
export async function pollLiveTicker(): Promise<LiveTickerPoll> {
  const [netRes, pricesRes, tvlRes, chainStatsRes] = await Promise.allSettled([
    getBaseNetworkStatus(),
    getMajorPrices(),
    getBaseChainTvl(),
    getChainStats(),
  ]);

  return {
    net: netRes.status === "fulfilled" && netRes.value.ok ? netRes.value.data : null,
    prices: pricesRes.status === "fulfilled" && pricesRes.value.ok ? pricesRes.value.data : null,
    tvl: tvlRes.status === "fulfilled" && tvlRes.value.ok ? tvlRes.value.data : null,
    chainStats: chainStatsRes.status === "fulfilled" && chainStatsRes.value.ok ? chainStatsRes.value.data : null,
  };
}

/** `useLivePrice`'s poll — same bulk `getBaseEcosystemMarkets` + id match, now run server-side. */
export async function pollLivePrice(coingeckoId: string): Promise<CoinMarket | null> {
  const result = await getBaseEcosystemMarkets(250);
  if (!result.ok) return null;
  return result.data.find((m) => m.id === coingeckoId) ?? null;
}

/** PR-102 — `tvlUsd` is this protocol's Base-chain-specific TVL (Base Radar's canonical TVL), never its global total. `null` when DefiLlama has no Base-specific breakdown for a matched protocol — never silently substituted with the global figure. */
export type LiveTvlPoll = { tvlUsd: number | null; changePct24h: number | null };

/** `useLiveTvl`'s poll — same bulk `getBaseProtocols` + slug match, now run server-side. */
export async function pollLiveTvl(defillamaSlug: string): Promise<LiveTvlPoll | null> {
  const result = await getBaseProtocols();
  if (!result.ok) return null;
  const match = result.data.find((protocol) => slugify(protocol.name) === defillamaSlug);
  return match ? { tvlUsd: match.baseTvlUsd, changePct24h: match.changePct24h } : null;
}
