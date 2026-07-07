import { Activity } from "lucide-react";

import { formatCompactNumber, formatGwei, formatNumber } from "@/lib/data/format";
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

  return (
    <WidgetCard
      icon={<Activity className="size-5" aria-hidden="true" />}
      title="Market"
      subtitle={`${data.chainName} network`}
      accent="accent"
      source={data.source}
      lastUpdated={lastUpdated}
    >
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Gas" value={formatGwei(data.gasGwei)} />
        <Stat label="Active Wallets" value={`${formatCompactNumber(data.activeWallets24h)}`} />
        <Stat label="Latest Block Txns" value={formatNumber(data.txCountLatestBlock)} />
        <Stat label="Block Height" value={formatCompactNumber(data.blockHeight)} />
      </div>

      <ProgressBar
        value={loadPct}
        label={`Network load · ~${data.estimatedTps} TPS`}
        colorClassName={loadPct > 70 ? "bg-radar-orange" : "bg-radar-success"}
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
