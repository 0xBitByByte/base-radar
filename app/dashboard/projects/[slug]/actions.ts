"use server";

/**
 * Project Profile Price chart period filters (PR12 Req 5). A Server Action
 * rather than a new API route or provider — it's a thin RPC wrapper around
 * `coingecko.getMarketChart`, the same cache-/rate-limit-guarded provider
 * service every other CoinGecko call in this codebase goes through. Only
 * called when a signed-in-nowhere visitor clicks a period pill on the
 * Project Profile page; the default 24H/7D view still renders from
 * `market.sparkline7d` with zero extra requests.
 */

import * as coingecko from "@/lib/providers/coingecko/service";
import { downsampleSparkline } from "@/lib/data/downsample";
import type { SparklinePoint } from "@/lib/data/types";

export type PricePeriod = "24H" | "7D" | "30D" | "90D" | "1Y" | "ALL";

const PERIOD_DAYS: Record<PricePeriod, number | "max"> = {
  "24H": 1,
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
  ALL: "max",
};

/**
 * PR-097.01 (Performance — H2) — a multi-year "ALL"/"1Y" period can return
 * several hundred to ~1,000+ raw provider points; bounded here before
 * `ProfileChart.tsx` (a `recharts` `AreaChart`) ever sees them, rather
 * than in the chart component itself. 300 is comfortably above what any
 * real chart width on this page can visually resolve as distinct points.
 */
const MAX_CHART_POINTS = 300;

export async function getProjectPriceHistory(
  coingeckoId: string,
  period: PricePeriod
): Promise<SparklinePoint[] | null> {
  const result = await coingecko.getMarketChart(coingeckoId, PERIOD_DAYS[period]);
  if (!result.ok) return null;
  return downsampleSparkline(result.data.prices, MAX_CHART_POINTS);
}

/**
 * PR13.7 Goal 9 — real volume-over-time for the same period, from the exact
 * same cached `coingecko.getMarketChart` call `getProjectPriceHistory`
 * already makes for this id+period (same cache key — a second call for a
 * period already fetched is a cache hit, not a new network request).
 */
export async function getProjectVolumeHistory(
  coingeckoId: string,
  period: PricePeriod
): Promise<SparklinePoint[] | null> {
  const result = await coingecko.getMarketChart(coingeckoId, PERIOD_DAYS[period]);
  if (!result.ok) return null;
  return downsampleSparkline(result.data.volumes, MAX_CHART_POINTS);
}
