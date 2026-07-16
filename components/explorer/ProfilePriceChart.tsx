"use client";

import { useState, useTransition } from "react";

import { ProfileChart } from "@/components/explorer/ProfileChart";
import { getProjectPriceHistory, type PricePeriod } from "@/app/dashboard/projects/[slug]/actions";
import { cn } from "@/lib/utils";
import type { SparklinePoint } from "@/lib/data/types";

type ProfilePriceChartProps = {
  /** `null` when this project has no `coingeckoId` configured — period switching is disabled and only the initial (7-day) series renders. */
  coingeckoId: string | null;
  initialData: SparklinePoint[];
};

const PERIODS: PricePeriod[] = ["24H", "7D", "30D", "90D", "1Y", "ALL"];

/**
 * Wraps `ProfileChart` with real period filters (PR12 Req 5) — clicking a
 * pill calls the `getProjectPriceHistory` Server Action, which fetches
 * `coingecko.getMarketChart(id, days)` (an already-cache-/rate-limit-guarded
 * provider call), instead of fabricating longer ranges from the 7-day
 * sparkline. The default view stays the real 7-day sparkline already on the
 * page with zero extra requests until a different period is picked.
 */
export function ProfilePriceChart({ coingeckoId, initialData }: ProfilePriceChartProps) {
  const [period, setPeriod] = useState<PricePeriod>("7D");
  const [data, setData] = useState<SparklinePoint[]>(initialData);
  const [isPending, startTransition] = useTransition();

  function handlePeriodClick(next: PricePeriod) {
    if (next === period || !coingeckoId) return;
    setPeriod(next);
    startTransition(async () => {
      const history = await getProjectPriceHistory(coingeckoId, next);
      if (history && history.length > 1) setData(history);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {coingeckoId && (
        <div className="flex flex-wrap justify-end gap-1" role="group" aria-label="Price chart period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodClick(p)}
              aria-pressed={p === period}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                p === period
                  ? "bg-radar-primary/10 text-radar-primary dark:bg-radar-primary/15 dark:text-radar-accent"
                  : "text-radar-light-muted hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <ProfileChart
        data={data}
        variant="price"
        height={130}
        className={cn("transition-opacity", isPending && "opacity-60")}
      />
    </div>
  );
}
