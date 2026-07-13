"use client";

import { use } from "react";

import { LiveStatusBar } from "@/components/dashboard/LiveStatusBar";
import type { LiveTicker, WithSource } from "@/lib/data/types";

/**
 * Unwraps the ticker promise `DashboardRouteLayout` hands down without
 * ever awaiting it itself (PR9.3.4 §3) — `use()` suspends this one small
 * component if the promise isn't settled yet, so Sidebar/Topbar above it
 * paint immediately regardless of how long the ticker's provider calls take.
 */
export function LiveStatusBarAsync({ tickerPromise }: { tickerPromise: Promise<WithSource<LiveTicker>> }) {
  const ticker = use(tickerPromise);
  return <LiveStatusBar data={ticker} />;
}
