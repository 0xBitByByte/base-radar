import { Activity } from "lucide-react";

import { formatCompactCurrency, formatCompactNumber, formatGwei, formatNumber } from "@/lib/data/format";
import type { MarketOverview, WithSource } from "@/lib/data/types";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { ProgressBar } from "@/components/ui/ProgressBar";

type MarketWidgetProps = {
  data: WithSource<MarketOverview>;
  lastUpdated: string;
};

const REFERENCE_MAX_TPS = 150;

export function MarketWidget({ data, lastUpdated }: MarketWidgetProps) {
  const loadPct = Math.min(100, Math.round((data.estimatedTps / REFERENCE_MAX_TPS) * 100));
  const networkHealth = loadPct > 85 ? "Congested" : loadPct > 60 ? "Elevated Load" : "Healthy";

  return (
    <WidgetCard
      icon={<Activity className="size-5" aria-hidden="true" />}
      title="Market"
      subtitle={`Live network & ecosystem stats for ${data.chainName}`}
      accent="accent"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Gas" value={formatGwei(data.gasGwei)} />
        <Stat label="Block Height" value={formatCompactNumber(data.blockHeight)} />
        <Stat label="Latest Block Txns" value={formatNumber(data.txCountLatestBlock)} />
        <Stat label="Transactions Today" value={data.transactionsToday !== null ? formatCompactNumber(data.transactionsToday) : "Not available"} />
        <Stat label="Total Value Locked" value={data.tvlUsd !== null ? formatCompactCurrency(data.tvlUsd) : "Not available"} />
        <Stat label="Total Addresses" value={data.totalAddresses !== null ? formatCompactNumber(data.totalAddresses) : "Not available"} />
      </div>

      <ProgressBar
        value={loadPct}
        label={`Network load · ~${data.estimatedTps} TPS · ${networkHealth}`}
        colorClassName={loadPct > 85 ? "bg-radar-danger" : loadPct > 60 ? "bg-radar-orange" : "bg-radar-success"}
      />
    </WidgetCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-radar-light-muted dark:text-radar-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-radar-light-text dark:text-radar-white">
        {value}
      </span>
    </div>
  );
}
