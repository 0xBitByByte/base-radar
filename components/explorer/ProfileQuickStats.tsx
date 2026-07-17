import { BarChart3, Coins, DollarSign, Droplets, Gauge, Wallet } from "lucide-react";

import { ChangeValue } from "@/components/explorer/ChangeValue";
import { formatCompactCurrency, formatPrice } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import type { Market, Trading, Tvl } from "@/lib/intelligence/types";

type ProfileQuickStatsProps = {
  market: Market;
  tvl: Tvl;
  trading: Trading;
};

function QuickStat({
  icon: Icon,
  label,
  children,
  unavailable,
}: {
  icon: typeof DollarSign;
  label: string;
  children: React.ReactNode;
  unavailable?: boolean;
}) {
  return (
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
}

/**
 * PR13.3 Goal 5 — a Quick Stats row directly below the Header, giving the
 * page's most-scanned numbers (Price/24h/TVL/Liquidity/Volume/FDV) their own
 * scannable row instead of requiring a scroll into Token & Price or Metrics.
 * Every value is the exact same already-computed `market`/`tvl`/`trading`
 * field those sections already render — no new fetch, no recomputation.
 */
export function ProfileQuickStats({ market, tvl, trading }: ProfileQuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      <QuickStat icon={DollarSign} label="Price" unavailable={!market.available || market.priceUsd === null}>
        {market.available && market.priceUsd !== null ? formatPrice(market.priceUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={BarChart3} label="24h" unavailable={!market.available || market.changePct24h === null}>
        {market.available && market.changePct24h !== null ? (
          <ChangeValue value={market.changePct24h} className="text-sm" />
        ) : (
          "Not Tracked"
        )}
      </QuickStat>
      <QuickStat icon={Wallet} label="TVL" unavailable={!tvl.available || tvl.tvlUsd === null}>
        {tvl.available && tvl.tvlUsd !== null ? formatCompactCurrency(tvl.tvlUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={Droplets} label="Liquidity" unavailable={!trading.available || trading.liquidityUsd === null}>
        {trading.available && trading.liquidityUsd !== null ? formatCompactCurrency(trading.liquidityUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={Gauge} label="Volume 24h" unavailable={!trading.available || trading.volume24hUsd === null}>
        {trading.available && trading.volume24hUsd !== null ? formatCompactCurrency(trading.volume24hUsd) : "Not Tracked"}
      </QuickStat>
      <QuickStat icon={Coins} label="FDV" unavailable={!market.available || market.fullyDilutedValuationUsd === null}>
        {market.available && market.fullyDilutedValuationUsd !== null ? formatCompactCurrency(market.fullyDilutedValuationUsd) : "Not Tracked"}
      </QuickStat>
    </div>
  );
}
