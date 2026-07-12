"use client";

import { formatCompactCurrency, formatCompactNumber, formatGwei, formatPrice } from "@/lib/data/format";
import type { LiveTicker, WithSource } from "@/lib/data/types";
import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import { useNowTick } from "@/lib/hooks/useNowTick";
import { cn } from "@/lib/utils";

type LiveStatusBarProps = {
  data: WithSource<LiveTicker>;
};

function TickerItem({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span className="text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className={cn("font-semibold text-radar-light-text dark:text-radar-white", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return (
    <span className="h-3 w-px shrink-0 bg-radar-light-border dark:bg-white/10" aria-hidden="true" />
  );
}

export function LiveStatusBar({ data }: LiveStatusBarProps) {
  const { status, updatedAt } = useLiveNetworkStatus();
  const now = useNowTick(1000);

  const blockHeight = status?.blockHeight ?? data.blockHeight;
  const gasGwei = status?.gasGwei ?? data.gasGwei;
  const secondsAgo = updatedAt ? Math.max(0, Math.round((now - updatedAt) / 1000)) : null;

  return (
    <div
      className="hidden items-center gap-5 overflow-x-auto border-b border-radar-light-border bg-radar-light-surface/60 px-4 py-2 text-xs sm:flex sm:px-6 lg:px-10 dark:border-white/10 dark:bg-white/[0.02]"
      role="status"
      aria-label="Live Base network status"
    >
      <TickerItem label="Block" value={formatCompactNumber(blockHeight)} />
      <Divider />
      <TickerItem label="Gas" value={formatGwei(gasGwei)} />
      <Divider />
      <TickerItem
        label="ETH"
        value={formatPrice(data.ethPriceUsd)}
        valueClassName={data.ethChangePct24h >= 0 ? "text-radar-success" : "text-radar-danger"}
      />
      <Divider />
      <TickerItem
        label="BTC"
        value={formatPrice(data.btcPriceUsd)}
        valueClassName={data.btcChangePct24h >= 0 ? "text-radar-success" : "text-radar-danger"}
      />
      <Divider />
      <TickerItem label="TVL" value={formatCompactCurrency(data.tvlUsd)} />
      <Divider />
      <TickerItem label="Transactions" value={formatCompactNumber(data.transactionsToday)} />

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-radar-light-muted/70 whitespace-nowrap dark:text-radar-muted/50">
          Updated {secondsAgo !== null ? `${secondsAgo}s ago` : "just now"}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-radar-success">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-radar-success opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-radar-success" />
          </span>
          LIVE
        </span>
      </div>
    </div>
  );
}
