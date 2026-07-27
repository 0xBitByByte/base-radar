import { BarChart3, Coins, DollarSign, Droplets, Gauge, Wallet } from "lucide-react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { Tooltip } from "@/components/ui/Tooltip";
import { PROVIDER_BRANDING } from "@/lib/branding/providers";
import { formatCompactCurrency, formatPrice } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { Market, MetricResolution, Trading, Tvl } from "@/lib/intelligence/types";

type ProfileQuickStatsProps = {
  market: Market;
  tvl: Tvl;
  trading: Trading;
};

/**
 * PR-050 provider-resolution — every tile's tooltip is built straight from
 * its real `MetricResolution` (never a guess): when a value is present, it
 * names the provider that actually supplied it and, if a higher-priority
 * provider was tried first and came up empty, says so ("Fallback — X
 * unavailable"); when nothing is available, it shows the resolution's own
 * real `failureReason` — the exact providers checked and why each failed.
 */
function resolutionTooltip(resolution: MetricResolution<number>): string {
  if (resolution.value !== null && resolution.provider) {
    const providerLabel = PROVIDER_BRANDING[resolution.provider]?.label ?? resolution.provider;
    if (!resolution.fallbackUsed) return `Source: ${providerLabel}`;
    const primary = resolution.attemptedProviders[0];
    const primaryLabel = primary ? (PROVIDER_BRANDING[primary.provider]?.label ?? primary.provider) : "the primary provider";
    return `Source: ${providerLabel} · Fallback — ${primaryLabel} unavailable (${primary?.detail ?? "no data"})`;
  }
  return resolution.failureReason ?? "No provider currently supplies this metric.";
}

function QuickStat({
  icon: Icon,
  label,
  children,
  unavailable,
  reason,
}: {
  icon: typeof DollarSign;
  label: string;
  children: React.ReactNode;
  unavailable?: boolean;
  /** Always shown in a tooltip — either the source (+ fallback note) when available, or the real reason when not. */
  reason?: string;
}) {
  const body = (
    <div className="flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-card p-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-white/10 dark:bg-radar-card">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        <span
          className={cn(
            "truncate text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white",
            unavailable && "text-radar-light-muted font-medium normal-case dark:text-radar-muted"
          )}
        >
          {children}
        </span>
      </div>
    </div>
  );

  if (!reason) return body;
  return (
    <Tooltip className="block" content={reason}>
      {body}
    </Tooltip>
  );
}

/**
 * PR13.3 Goal 5 — a Quick Stats row directly below the Header, giving the
 * page's most-scanned numbers (Price/24h/TVL/Liquidity/Volume/FDV) their own
 * scannable row instead of requiring a scroll into Token & Price or Metrics.
 * Every value is the exact same already-computed `market`/`tvl`/`trading`
 * field those sections already render — no new fetch, no recomputation.
 *
 * PR-050 provider-resolution — every tile now shows its real resolution
 * (source + fallback, or the real failure reason) in a tooltip, sourced
 * from `priceResolution`/`volumeResolution`/`liquidityResolution`/
 * `tvlResolution` (`lib/intelligence/resolution.ts`) rather than a single
 * hardcoded provider's status.
 */
export function ProfileQuickStats({ market, tvl, trading }: ProfileQuickStatsProps) {
  const priceReason = resolutionTooltip(market.priceResolution);
  const tvlReason = resolutionTooltip(tvl.tvlResolution);
  const liquidityReason = resolutionTooltip(trading.liquidityResolution);
  const volumeReason = resolutionTooltip(trading.volumeResolution);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      <QuickStat icon={DollarSign} label="Price" unavailable={market.priceUsd === null} reason={priceReason}>
        {market.priceUsd !== null ? formatPrice(market.priceUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={BarChart3} label="24h Change" unavailable={!market.available || market.changePct24h === null} reason={priceReason}>
        {market.available && market.changePct24h !== null ? (
          <ChangeValue value={market.changePct24h} className="text-sm" />
        ) : (
          "Not Tracked"
        )}
      </QuickStat>
      <QuickStat icon={Wallet} label="TVL" unavailable={tvl.tvlUsd === null} reason={tvlReason}>
        {tvl.tvlUsd !== null ? formatCompactCurrency(tvl.tvlUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={Droplets} label="Liquidity" unavailable={trading.liquidityUsd === null} reason={liquidityReason}>
        {trading.liquidityUsd !== null ? formatCompactCurrency(trading.liquidityUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={Gauge} label="Volume 24h" unavailable={trading.volume24hUsd === null} reason={volumeReason}>
        {trading.volume24hUsd !== null ? formatCompactCurrency(trading.volume24hUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat
        icon={Coins}
        label="FDV"
        unavailable={!market.available || market.fullyDilutedValuationUsd === null}
        reason={priceReason}
      >
        {market.available && market.fullyDilutedValuationUsd !== null ? formatCompactCurrency(market.fullyDilutedValuationUsd) : "Not Tracked"}
      </QuickStat>
    </div>
  );
}
