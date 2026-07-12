"use client";

import { Wallet } from "lucide-react";

import { formatCompactCurrency, formatCompactCurrencyParts, formatPercent } from "@/lib/data/format";
import type { PortfolioSummary, WithSource } from "@/lib/data/types";
import { TREND_COLOR_VAR } from "@/lib/utils";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Sparkline } from "@/components/ui/Sparkline";

type PortfolioWidgetProps = {
  data: WithSource<PortfolioSummary>;
  lastUpdated: string;
};

export function PortfolioWidget({ data, lastUpdated }: PortfolioWidgetProps) {
  const isUp = data.pnlPct24h >= 0;

  return (
    <WidgetCard
      icon={<Wallet className="size-5" aria-hidden="true" />}
      title="Portfolio"
      subtitle="Connected wallets"
      accent="primary"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      {data.holdings.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No holdings yet"
          description="Connect a wallet to see your portfolio here."
        />
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <AnimatedNumber
                value={data.totalValue}
                format={formatCompactCurrencyParts}
                className="whitespace-nowrap"
              />
              <p
                className={
                  isUp
                    ? "text-xs font-medium text-radar-success"
                    : "text-xs font-medium text-radar-danger"
                }
              >
                {formatPercent(data.pnlPct24h)} · {formatCompactCurrency(data.pnlValue24h)} today
              </p>
            </div>
            <Sparkline
              data={data.sparkline}
              color={isUp ? TREND_COLOR_VAR.up : TREND_COLOR_VAR.down}
              height={44}
              className="w-24"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {data.holdings.map((asset) => (
              <div key={asset.symbol} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-semibold text-radar-light-text dark:text-radar-white">
                  {asset.symbol}
                </span>
                <ProgressBar
                  value={asset.allocationPct}
                  showValue={false}
                  colorClassName="bg-radar-primary"
                  className="flex-1"
                />
                <span className="w-12 shrink-0 text-right text-xs text-radar-light-muted dark:text-radar-muted">
                  {asset.allocationPct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
