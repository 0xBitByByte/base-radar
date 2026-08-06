"use client";

import { use } from "react";
import { Flame, PieChart } from "lucide-react";

import { NetworkStat } from "@/components/explorer/ProfileNetworkLive";
import type { ChainStats } from "@/lib/providers/blockscout/service";
import type { ProviderResult } from "@/lib/providers/common/types";

type ProfileNetworkChainStatsAsyncProps = {
  chainStatsPromise: Promise<ProviderResult<ChainStats>>;
};

/**
 * PR-078 §5 — real Base-chain-wide gas trend and network utilization from
 * Blockscout's `/stats` endpoint (`blockscout.getChainStats()`), already
 * implemented and mapped (`ChainStats`) but never actually rendered
 * anywhere before this — confirmed via the provider-coverage audit
 * (docs/PROVIDER_DATA_COVERAGE_AUDIT.md §6). Fetched once, extended/
 * Profile-page-only (not live-polled, not part of the batch Explorer/
 * Dashboard path), joining the same Network strip as `ProfileNetworkLive`'s
 * other cells via `children`. Summarized, not a block explorer: two numbers
 * (a 3-point gas trend, a single utilization percentage), not a transaction
 * list — keeps this section "lightweight explorer" without duplicating
 * BaseScan.
 */
/**
 * Server-safe Suspense fallback, same reason `VerifiedContractsFallback`
 * (`ProfileNetworkLive.tsx`) exists: `ProfileMetrics.tsx` (a Server
 * Component) can't pass a raw icon component reference like `icon={Flame}`
 * as a prop into `NetworkStat` (a Client Component) — React can't
 * serialize a bare function across that boundary. Hardcoding the icons
 * here, inside this already-client module, keeps the fallback's own props
 * (none) trivially serializable.
 */
export function ChainStatsFallback() {
  return (
    <>
      <NetworkStat icon={PieChart} label="Utilization" value="Not Tracked" unavailable />
      <NetworkStat icon={Flame} label="Gas Trend" value="Not Tracked" unavailable />
    </>
  );
}

export function ProfileNetworkChainStatsAsync({ chainStatsPromise }: ProfileNetworkChainStatsAsyncProps) {
  const result = use(chainStatsPromise);

  if (!result.ok) {
    return <ChainStatsFallback />;
  }

  const { slow, average, fast } = result.data.gasPriceGwei;
  return (
    <>
      {/* PR-078 FINAL REVIEW — trust-review finding: this cell previously
          rendered a bare "0.01 / 0.01 / 0.02" with no unit, sitting right
          next to the sibling "Gas" cell's own, differently-sourced
          "0.006 gwei" (Base RPC's single live read vs. this cell's
          Blockscout-reported slow/average/fast). A first-time reader has no
          way to know these are three gwei tiers, or why they differ from
          "Gas" right next to them, without a unit. Appending "gwei" (same
          unit convention the "Gas" cell already uses) resolves the
          ambiguity without restructuring the strip. */}
      <NetworkStat icon={PieChart} label="Utilization" value={`${result.data.networkUtilizationPct.toFixed(1)}%`} />
      <NetworkStat icon={Flame} label="Gas Trend" value={`${slow.toFixed(2)} / ${average.toFixed(2)} / ${fast.toFixed(2)} gwei`} />
    </>
  );
}
