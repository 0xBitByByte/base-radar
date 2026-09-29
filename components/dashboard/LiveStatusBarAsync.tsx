"use client";

import { LiveStatusBar } from "@/components/dashboard/LiveStatusBar";
import type { LiveTicker, WithSource } from "@/lib/data/types";

/**
 * Vercel-incident follow-up — previously unwrapped a server-started
 * `tickerPromise` via `use()`. `DashboardLayout` now fetches the ticker
 * client-side (see its own doc comment) and only renders this component
 * once real data has arrived, rendering a `WidgetSkeleton` itself while
 * waiting — so this component just renders the data it's handed, no
 * `use()`/Suspense involved.
 */
export function LiveStatusBarAsync({ ticker }: { ticker: WithSource<LiveTicker> }) {
  return <LiveStatusBar data={ticker} />;
}
