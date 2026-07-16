"use client";

import { MetricItem } from "@/components/explorer/MetricItem";
import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import { formatGwei, formatNumber } from "@/lib/data/format";

type ProfileNetworkLiveProps = {
  gasGwei: number | null;
  blockHeight: number | null;
  estimatedTps: number | null;
};

const POLL_MS = 45_000;

/**
 * Live-polling wrapper around the Network section's Gas Price/Block
 * Height/Est. TPS tiles (PR12.2) — reuses `useLiveNetworkStatus` and the
 * exact same underlying `base.getBaseNetworkStatus()` call `sources.ts`'s
 * `matchNetwork()` already made for this page's first paint, zero new
 * provider surface, mirroring `MarketWidgetLive`'s relationship to the
 * dashboard's Market widget.
 *
 * Unlike `MarketWidgetLive`, this doesn't seed `useLiveNetworkStatus`'s
 * `initial` — `ChainInfo.network` (this page's merged shape) only carries
 * the 3 fields this section renders, not the full `NetworkStatus` the
 * hook's `initial` option expects. The hook polls immediately on mount
 * instead, and this component shows the SSR snapshot as a fallback until
 * that first poll resolves — one extra Base RPC call on page load, on the
 * cheapest and most generously-limited provider in this codebase (20s TTL,
 * 30 req/60s), not worth widening the shared `usePolling` seed contract to
 * avoid.
 */
export function ProfileNetworkLive({ gasGwei, blockHeight, estimatedTps }: ProfileNetworkLiveProps) {
  const { status } = useLiveNetworkStatus(POLL_MS);

  const live = {
    gasGwei: status?.gasGwei ?? gasGwei,
    blockHeight: status?.blockHeight ?? blockHeight,
    estimatedTps: status?.estimatedTps ?? estimatedTps,
  };

  return (
    <>
      <MetricItem bare label="Gas Price" value={live.gasGwei !== null ? formatGwei(live.gasGwei) : undefined} unavailable={live.gasGwei === null} />
      <MetricItem bare label="Block Height" value={live.blockHeight !== null ? formatNumber(live.blockHeight) : undefined} unavailable={live.blockHeight === null} />
      <MetricItem bare label="Est. TPS" value={live.estimatedTps !== null ? formatNumber(live.estimatedTps) : undefined} unavailable={live.estimatedTps === null} />
    </>
  );
}
