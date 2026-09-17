"use client";

import { MarketWidget } from "@/components/dashboard/MarketWidget";
import { useSharedNetworkStatus } from "@/components/dashboard/NetworkStatusProvider";
import type { MarketOverview, WithSource } from "@/lib/data/types";

type MarketWidgetLiveProps = {
  data: WithSource<MarketOverview>;
  lastUpdated: string;
};

/**
 * Live-polling wrapper around `MarketWidget` — mirrors `LiveStatusBar`'s
 * relationship to `useLiveTicker` (PR12.2): seeds from the server-rendered
 * `data`/`lastUpdated`, then swaps in fresh Base network stats as the
 * shared network-status poll updates. Despite its name, `MarketWidget` is a
 * Base network-stats widget — `getMarketOverview()` (`lib/data/aggregate.ts`)
 * already calls the exact same `base.getBaseNetworkStatus()` this reads,
 * so this introduces zero new provider surface. `MarketWidget` itself is
 * untouched and still directly usable/testable standalone; only this
 * wrapper — and `app/dashboard/page.tsx`'s one render call site — are new.
 *
 * PR-107 — reads the ONE shared poll from `<NetworkStatusProvider>`
 * (mounted at the dashboard layout) via `useSharedNetworkStatus()`, rather
 * than running its own independent `useLiveNetworkStatus` instance seeded
 * from `data` as it used to. `Topbar` is mounted on every `/dashboard/*`
 * page including `/dashboard` itself, so the old per-component call meant
 * 2 separate Base RPC polling loops on this exact page — confirmed live in
 * the PR-106/106.1 audits. The `status ? {...} : data` fallback below is
 * unchanged, so the first paint (this component's own real SSR `data`) is
 * identical either way — only the shared poll's timing differs from the
 * old seeded-skip-first-poll behavior, imperceptibly.
 */
export function MarketWidgetLive({ data, lastUpdated }: MarketWidgetLiveProps) {
  const { status, updatedAt } = useSharedNetworkStatus();

  // `NetworkStatus` (the raw provider shape `status` carries) is a strict
  // subset of `MarketOverview` — `gasTrend`/`chainName`/`tvlUsd`/
  // `transactionsToday`/`totalAddresses` have no live-polled source in this
  // shared poll (they're fetched once per page load in `getMarketOverviewImpl`
  // instead, since they change far slower than gas/block height), so they
  // always pass through from the initial server render unchanged.
  const live: WithSource<MarketOverview> = status
    ? { ...data, ...status, source: "live" }
    : data;

  return <MarketWidget data={live} lastUpdated={updatedAt ? new Date(updatedAt).toISOString() : lastUpdated} />;
}
