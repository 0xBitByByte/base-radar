"use client";

import { useEffect, useState, useTransition } from "react";

import { ProfileChart } from "@/components/explorer/ProfileChart";
import { getProjectVolumeHistory, type PricePeriod } from "@/app/dashboard/projects/[slug]/actions";
import { formatCompactCurrency } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { SparklinePoint } from "@/lib/data/types";

type ProfileVolumeTrendPanelProps = {
  coingeckoId: string | null;
};

const PERIODS: PricePeriod[] = ["7D", "30D", "90D", "1Y", "ALL"];

/**
 * PR-079 Section 2 / PR-082 — the Volume Overview card's expanded detail.
 * Now a real chart (`ProfileChart`, the same recipe/gradient-area component
 * `ProfilePriceChart` uses) plotted over CoinGecko's own volume series, with
 * the same period-pill pattern `ProfilePriceChart` already established
 * (click a period → `getProjectVolumeHistory` Server Action → same cached
 * `coingecko.getMarketChart` call, a cache hit whenever the Price card
 * already fetched that period) — no new provider, no new endpoint. The
 * initial period loads lazily on mount (this component only renders once
 * the Volume card is expanded), so a reader who never opens it costs zero
 * extra requests.
 */
export function ProfileVolumeTrendPanel({ coingeckoId }: ProfileVolumeTrendPanelProps) {
  const [period, setPeriod] = useState<PricePeriod>("7D");
  const [data, setData] = useState<SparklinePoint[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [failedPeriods, setFailedPeriods] = useState<Set<PricePeriod>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!coingeckoId) return;
    let cancelled = false;
    getProjectVolumeHistory(coingeckoId, "7D").then((history) => {
      if (cancelled) return;
      if (history && history.length > 0) {
        setData(history);
        setStatus("ready");
      } else {
        setStatus("failed");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [coingeckoId]);

  function handlePeriodClick(next: PricePeriod) {
    if (next === period || !coingeckoId || failedPeriods.has(next)) return;
    const previous = period;
    setPeriod(next);
    startTransition(async () => {
      const history = await getProjectVolumeHistory(coingeckoId, next);
      if (history && history.length > 0) {
        setData(history);
      } else {
        // Same "never leave a highlighted pill next to stale data" rule
        // `ProfilePriceChart` follows — revert and disable this period
        // rather than silently keep showing the previous chart.
        setPeriod(previous);
        setFailedPeriods((prev) => new Set(prev).add(next));
      }
    });
  }

  if (!coingeckoId) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">No CoinGecko token configured — volume history unavailable.</p>;
  }

  if (status === "loading") {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">Loading volume history…</p>;
  }

  if (status === "failed" || !data) {
    return <p className="text-xs text-radar-light-muted dark:text-radar-muted">CoinGecko didn&apos;t return a volume history for this token just now.</p>;
  }

  const averageVolume = data.length > 0 ? data.reduce((sum, point) => sum + point.v, 0) / data.length : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">
          Avg. Volume ({period}){" "}
          <span className="font-semibold text-radar-light-text normal-case dark:text-radar-white">
            {averageVolume !== null ? formatCompactCurrency(averageVolume) : "Not Tracked"}
          </span>
        </span>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Volume chart period">
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
      </div>
      <ProfileChart data={data} variant="currency" height={110} className={cn("transition-opacity", isPending && "opacity-60")} />
      {/* CoinGecko's global market volume (all exchanges/chains) is a different scope than the
          card's collapsed 24h figure (DexScreener, this project's Base-chain pools only) — called
          out here so the two numbers next to each other don't read as a mismatched spike/drop. */}
      <span className="text-[10px] text-radar-light-muted/70 dark:text-radar-muted/60">CoinGecko · all markets, not just Base</span>
    </div>
  );
}
