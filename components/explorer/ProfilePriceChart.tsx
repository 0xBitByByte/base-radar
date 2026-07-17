"use client";

import { useState, useTransition } from "react";

import { ProfileChart } from "@/components/explorer/ProfileChart";
import { getProjectPriceHistory, getProjectVolumeHistory, type PricePeriod } from "@/app/dashboard/projects/[slug]/actions";
import { formatCompactCurrency } from "@/lib/data/format";
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
 *
 * PR13.6 Goal 7 — the active pill must never lie about what's on screen. A
 * failed or empty fetch (CoinGecko rate-limited, or genuinely no history for
 * that range) now reverts the selection to the period whose data is still
 * showing, instead of leaving a newly-highlighted pill next to a graph that
 * silently never updated — the exact "every period shows the same graph"
 * symptom this goal calls out. A period that fails once is disabled for the
 * rest of this view (never re-fetched into the same dead end), with a short
 * explanation instead of a bare unresponsive button.
 */
export function ProfilePriceChart({ coingeckoId, initialData }: ProfilePriceChartProps) {
  const [period, setPeriod] = useState<PricePeriod>("7D");
  const [data, setData] = useState<SparklinePoint[]>(initialData);
  const [failedPeriods, setFailedPeriods] = useState<Set<PricePeriod>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [averageVolumeUsd, setAverageVolumeUsd] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePeriodClick(next: PricePeriod) {
    if (next === period || !coingeckoId || failedPeriods.has(next)) return;
    setNotice(null);
    const previous = period;
    setPeriod(next);
    startTransition(async () => {
      const history = await getProjectPriceHistory(coingeckoId, next);
      if (history && history.length > 1) {
        setData(history);
        // Goal 9 — same cached `market_chart` fetch `getProjectPriceHistory`
        // just made for this id+period; a cache hit, not a new request.
        const volumeHistory = await getProjectVolumeHistory(coingeckoId, next);
        setAverageVolumeUsd(
          volumeHistory && volumeHistory.length > 0
            ? volumeHistory.reduce((sum, point) => sum + point.v, 0) / volumeHistory.length
            : null
        );
      } else {
        // Revert so the highlighted pill always matches what's actually
        // rendered — never a "30D" pill sitting next to 7D's graph.
        setPeriod(previous);
        setFailedPeriods((prev) => new Set(prev).add(next));
        setNotice(`${next} history isn't available for this token right now — still showing ${previous}.`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {coingeckoId && (
        <div className="flex flex-wrap justify-end gap-1" role="group" aria-label="Price chart period">
          {PERIODS.map((p) => {
            const disabled = failedPeriods.has(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodClick(p)}
                disabled={disabled}
                aria-pressed={p === period}
                title={disabled ? `${p} history isn't available for this token` : undefined}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  disabled
                    ? "cursor-not-allowed text-radar-light-muted/40 dark:text-radar-muted/30"
                    : p === period
                      ? "bg-radar-primary/10 text-radar-primary dark:bg-radar-primary/15 dark:text-radar-accent"
                      : "text-radar-light-muted hover:bg-radar-light-surface dark:text-radar-muted dark:hover:bg-white/5"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
      {notice && <p className="text-right text-[10.5px] text-radar-warning">{notice}</p>}
      <ProfileChart
        data={data}
        variant="price"
        height={130}
        className={cn("transition-opacity", isPending && "opacity-60")}
      />
      {/* Goal 9 — Average Volume for the currently-selected period, only shown once a period fetch has resolved it (the default 7D sparkline view fetches no volume data, by design, to keep zero extra requests). */}
      {averageVolumeUsd !== null && (
        <p className="text-right text-[10.5px] text-radar-light-muted dark:text-radar-muted">
          Average Volume ({period}): <span className="font-medium text-radar-light-text dark:text-radar-white">{formatCompactCurrency(averageVolumeUsd)}</span>
        </p>
      )}
    </div>
  );
}
