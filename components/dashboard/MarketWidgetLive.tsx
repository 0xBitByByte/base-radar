"use client";

import { MarketWidget } from "@/components/dashboard/MarketWidget";
import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import type { MarketOverview, WithSource } from "@/lib/data/types";

type MarketWidgetLiveProps = {
  data: WithSource<MarketOverview>;
  lastUpdated: string;
};

const POLL_MS = 45_000;

/**
 * Live-polling wrapper around `MarketWidget` — mirrors `LiveStatusBar`'s
 * relationship to `useLiveTicker` (PR12.2): seeds from the server-rendered
 * `data`/`lastUpdated`, then swaps in fresh Base network stats as
 * `useLiveNetworkStatus` polls. Despite its name, `MarketWidget` is a Base
 * network-stats widget — `getMarketOverview()` (`lib/data/aggregate.ts`)
 * already calls the exact same `base.getBaseNetworkStatus()` this hook
 * wraps, so this introduces zero new provider surface. `MarketWidget`
 * itself is untouched and still directly usable/testable standalone; only
 * this wrapper — and `app/dashboard/page.tsx`'s one render call site — are
 * new.
 */
export function MarketWidgetLive({ data, lastUpdated }: MarketWidgetLiveProps) {
  const { status, updatedAt } = useLiveNetworkStatus(POLL_MS, {
    gasGwei: data.gasGwei,
    blockHeight: data.blockHeight,
    txCountLatestBlock: data.txCountLatestBlock,
    estimatedTps: data.estimatedTps,
    chainId: data.chainId,
  });

  // `NetworkStatus` (the raw provider shape `status` carries) is a strict
  // subset of `MarketOverview` — `gasTrend`/`chainName`/`activeWallets24h`
  // have no live source (confirmed: `activeWallets24h` is mock-only even in
  // the SSR path today, and `MarketWidget` itself never renders `gasTrend`),
  // so they always pass through from the initial server render unchanged.
  const live: WithSource<MarketOverview> = status
    ? { ...data, ...status, source: "live" }
    : data;

  return <MarketWidget data={live} lastUpdated={updatedAt ? new Date(updatedAt).toISOString() : lastUpdated} />;
}
