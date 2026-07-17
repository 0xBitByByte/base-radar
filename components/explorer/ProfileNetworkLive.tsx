"use client";

import { Activity, Fuel, Gauge, Globe, Radio, Zap } from "lucide-react";

import { useLiveNetworkStatus } from "@/lib/hooks/useLiveNetworkStatus";
import { formatNumber } from "@/lib/data/format";
import { cn } from "@/lib/utils";

type ProfileNetworkLiveProps = {
  chainLabel: string;
  gasGwei: number | null;
  blockHeight: number | null;
  estimatedTps: number | null;
  /** PR13.7 Goal 14 — real finality lag (blocks behind the chain's own "safe" tag), fetched once at page load (never live-polled — see `base.getFinality`'s own doc comment for why). `null` when the extended fetch failed or hasn't resolved. */
  finality: number | null;
};

const POLL_MS = 45_000;

/** The same premium icon-bg stat tile `ProfileQuickStats`/`ProfileTokenAndPrice` use — Network's one-row layout (PR13.6 Goal 10) reuses it here so all four tiles read as equal-weight members of the same row. */
function NetworkStat({ icon: Icon, label, value, unavailable }: { icon: typeof Fuel; label: string; value: string; unavailable?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-radar-primary/10 text-radar-primary dark:bg-radar-accent/10 dark:text-radar-accent">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">{label}</span>
        <span
          className={cn(
            "truncate text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white",
            unavailable && "text-radar-light-muted font-medium normal-case dark:text-radar-muted"
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/**
 * Live-polling Network row (PR12.2, redesigned PR13.6 Goal 10 into one
 * equal-width row of Network/Status/Block Height/Gas) — reuses
 * `useLiveNetworkStatus` and the exact same underlying
 * `base.getBaseNetworkStatus()` call `sources.ts`'s `matchNetwork()`
 * already made for this page's first paint, zero new provider surface,
 * mirroring `MarketWidgetLive`'s relationship to the dashboard's Market
 * widget. "Status" is a real derived value (whether this page's own
 * network data resolved), never fabricated.
 *
 * Unlike `MarketWidgetLive`, this doesn't seed `useLiveNetworkStatus`'s
 * `initial` — `ChainInfo.network` (this page's merged shape) only carries
 * the 3 fields this section renders, not the full `NetworkStatus` the
 * hook's `initial` option expects. The hook polls immediately on mount
 * instead, and this component shows the SSR snapshot as a fallback until
 * that first poll resolves — one extra Base RPC call on page load, on the
 * cheapest and most generously-limited provider in this codebase (20s TTL,
 * 30 req/60s), not worth widening the shared `usePolling` seed contract to
 * avoid.
 */
export function ProfileNetworkLive({ chainLabel, gasGwei, blockHeight, estimatedTps, finality }: ProfileNetworkLiveProps) {
  const { status } = useLiveNetworkStatus(POLL_MS);

  const live = {
    gasGwei: status?.gasGwei ?? gasGwei,
    blockHeight: status?.blockHeight ?? blockHeight,
    // Goal 14 — real, already-fetched by `getBaseNetworkStatus` (no new provider call), just not rendered here before.
    estimatedTps: status?.estimatedTps ?? estimatedTps,
  };
  const available = live.gasGwei !== null || live.blockHeight !== null;

  return (
    <>
      <NetworkStat icon={Globe} label="Network" value={chainLabel} />
      <NetworkStat icon={Radio} label="Status" value={available ? "Live" : "Reconnecting"} unavailable={!available} />
      <NetworkStat
        icon={Activity}
        label="Block Height"
        value={live.blockHeight !== null ? formatNumber(live.blockHeight) : "Reconnecting"}
        unavailable={live.blockHeight === null}
      />
      <NetworkStat icon={Fuel} label="Gas" value={live.gasGwei !== null ? `${live.gasGwei.toFixed(3)} gwei` : "Reconnecting"} unavailable={live.gasGwei === null} />
      <NetworkStat
        icon={Zap}
        label="Est. TPS"
        value={live.estimatedTps !== null ? formatNumber(live.estimatedTps) : "Reconnecting"}
        unavailable={live.estimatedTps === null}
      />
      <NetworkStat
        icon={Gauge}
        label="Finality"
        value={finality !== null ? `${formatNumber(finality)} block${finality === 1 ? "" : "s"} behind` : "Not Currently Available"}
        unavailable={finality === null}
      />
    </>
  );
}
