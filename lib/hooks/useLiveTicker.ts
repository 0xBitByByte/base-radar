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
 */

import { useEffect, useState } from "react";

import * as baseRpc from "@/lib/providers/base/service";
import * as coingecko from "@/lib/providers/coingecko/service";
import * as defillama from "@/lib/providers/defillama/service";
import * as blockscout from "@/lib/providers/blockscout/service";
import type { LiveTicker } from "@/lib/data/types";

const DEFAULT_POLL_MS = 45_000;

export function useLiveTicker(initial: LiveTicker, pollMs: number = DEFAULT_POLL_MS) {
  const [ticker, setTicker] = useState<LiveTicker>(initial);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const [netRes, pricesRes, tvlRes, chainStatsRes] = await Promise.allSettled([
        baseRpc.getBaseNetworkStatus(),
        coingecko.getMajorPrices(),
        defillama.getBaseChainTvl(),
        blockscout.getChainStats(),
      ]);
      if (cancelled) return;

      let anyLive = false;

      setTicker((prev) => {
        const next = { ...prev };

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

        return next;
      });

      if (anyLive) setUpdatedAt(Date.now());
    }

    poll();
    const interval = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { ticker, updatedAt };
}
