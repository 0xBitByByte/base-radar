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

export async function getProjectPriceHistory(
  coingeckoId: string,
  period: PricePeriod
): Promise<SparklinePoint[] | null> {
  const result = await coingecko.getMarketChart(coingeckoId, PERIOD_DAYS[period]);
  if (!result.ok) return null;
  return result.data;
}
