"use client";

/**
 * Client-poll refresh for the Live Status Bar's full ticker (PR10 Part 5) —
 * before this, only Block/Gas refreshed after mount (`useLiveNetworkStatus`);
 * ETH/BTC/TVL/Transactions stayed frozen at whatever the initial SSR fetch
 * returned. Same "UI -> Hooks -> Services -> Providers" pattern as that
 * hook, with one correction (Final Production Readiness PR): each poll now
 * calls `pollLiveTicker` (`lib/hooks/liveActions.ts`), a Server Action, not
 * `lib/providers` service modules directly — importing the provider layer into
 * this `"use client"` hook meant every poll ran as a browser-origin fetch
 * straight to CoinGecko/DefiLlama/Blockscout, none of which permit
 * cross-origin browser requests; confirmed live, every poll silently failed
 * (a CORS error in the console) so those three fields never actually
 * refreshed after the initial SSR paint. Base's own public RPC (block
 * height/gas) genuinely is CORS-open and was the one field really
 * refreshing. `pollLiveTicker` runs the same four providers server-side,
 * where this restriction doesn't apply — same merge-only-what-succeeded
 * logic below, unchanged, so a single failed provider still never blanks
 * out the others.
 *
 * Built on `usePolling` (PR12.2) — same public signature and return shape
 * as before, now additionally pausing while the tab is hidden and skipping
 * the redundant immediate poll right after the SSR-streamed `initial` value.
 */

import { useRef } from "react";

import { pollLiveTicker } from "@/lib/hooks/liveActions";
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
      const { net, prices, tvl, chainStats } = await pollLiveTicker();

      let anyLive = false;
      const next: LiveTicker = { ...tickerRef.current };

      if (net) {
        next.blockHeight = net.blockHeight;
        next.gasGwei = net.gasGwei;
        anyLive = true;
      }

      if (prices) {
        next.ethPriceUsd = prices.eth.usd;
        next.ethChangePct24h = prices.eth.changePct24h;
        next.btcPriceUsd = prices.btc.usd;
        next.btcChangePct24h = prices.btc.changePct24h;
        anyLive = true;
      }

      if (tvl) {
        next.tvlUsd = tvl.tvlUsd;
        anyLive = true;
      }

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
