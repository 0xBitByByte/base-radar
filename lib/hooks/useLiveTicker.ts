"use client";

/**
 * Client-poll refresh for the Live Status Bar's full ticker (PR10 Part 5) —
 * before this, only Block/Gas refreshed after mount (`useLiveNetworkStatus`);
 * ETH/BTC/TVL/Transactions stayed frozen at whatever the initial SSR fetch
 * returned. Same "UI -> Hooks -> Services -> Providers" pattern as that
 * hook: calls the Provider Layer's own cache-backed service functions
 * directly (no server action needed — these are public, unauthenticated
 * fetches), and merges only the fields a given poll actually returns live
 * data for, so a single failed provider never blanks out the others.
 *
 * Built on `usePolling` (PR12.2) — same public signature and return shape
 * as before, now additionally pausing while the tab is hidden and skipping
 * the redundant immediate poll right after the SSR-streamed `initial` value.
 */

import { useRef } from "react";

import * as baseRpc from "@/lib/providers/base/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import { usePolling } from "@/lib/hooks/usePolling";
import type { LiveTicker } from "@/lib/data/types";

const DEFAULT_POLL_MS = 45_000;

export function useLiveTicker(initial: LiveTicker, pollMs: number = DEFAULT_POLL_MS) {
  // `usePolling` replaces `data` wholesale with whatever `pollFn` returns —
  // this ref lets `pollFn` merge each poll's partial results onto the
  // latest known ticker itself (rather than `usePolling` needing to know
  // how to merge a `LiveTicker`), so a provider that fails on one poll
  // doesn't blank out a field a different provider successfully populated
  // on an earlier poll.
  const tickerRef = useRef(initial);

  const { data, updatedAt } = usePolling<LiveTicker>(
    async () => {
      const [netRes, pricesRes, tvlRes, chainStatsRes] = await Promise.allSettled([
        baseRpc.getBaseNetworkStatus(),
        coingecko.getMajorPrices(),
        defillama.getBaseChainTvl(),
        blockscout.getChainStats(),
      ]);

      let anyLive = false;
      const next: LiveTicker = { ...tickerRef.current };

      const net = netRes.status === "fulfilled" && netRes.value.ok ? netRes.value.data : null;
      if (net) {
        next.blockHeight = net.blockHeight;
        next.gasGwei = net.gasGwei;
        anyLive = true;
      }

      const prices = pricesRes.status === "fulfilled" && pricesRes.value.ok ? pricesRes.value.data : null;
      if (prices) {
        next.ethPriceUsd = prices.eth.usd;
        next.ethChangePct24h = prices.eth.changePct24h;
        next.btcPriceUsd = prices.btc.usd;
        next.btcChangePct24h = prices.btc.changePct24h;
        anyLive = true;
      }

      const tvl = tvlRes.status === "fulfilled" && tvlRes.value.ok ? tvlRes.value.data : null;
      if (tvl) {
        next.tvlUsd = tvl.tvlUsd;
        anyLive = true;
      }

      const chainStats = chainStatsRes.status === "fulfilled" && chainStatsRes.value.ok ? chainStatsRes.value.data : null;
      if (chainStats) {
        next.transactionsToday = chainStats.transactionsToday;
        anyLive = true;
      }

      if (!anyLive) return null;
      tickerRef.current = next;
      return next;
    },
    pollMs,
    { initial }
  );

  return { ticker: data ?? initial, updatedAt };
}
