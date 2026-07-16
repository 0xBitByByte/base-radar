"use client";

import { use } from "react";

import { ProfileChart } from "@/components/explorer/ProfileChart";
import type { SparklinePoint } from "@/lib/data/types";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * Unwraps the TVL-history promise for the sparkline chart itself — DefiLlama's
 * per-protocol history endpoint is the one genuinely slow provider call in
 * this codebase (observed 4-25s for long-running, multi-chain protocols
 * before this was moved off the critical render path); everything else in
 * the TVL & Liquidity section (current TVL, 24h change, DEX liquidity,
 * tracked pools, largest pool) comes from DefiLlama's fast bulk protocol
 * list and renders on first paint, unaffected.
 */
export function ProfileTvlChartAsync({
  resultPromise,
  tvlAvailable,
}: {
  resultPromise: Promise<ProviderResult<SparklinePoint[]> | null>;
  tvlAvailable: boolean;
}) {
  const result = use(resultPromise);
  const tvlHistory = result?.ok ? result.data : null;

  if (tvlHistory && tvlHistory.length > 1) {
    return <ProfileChart data={tvlHistory} variant="currency" color="var(--color-radar-accent)" height={130} />;
  }

  if (tvlAvailable) {
    return (
      <p className="text-xs text-radar-light-muted dark:text-radar-muted">
        No historical TVL series returned by DefiLlama for this protocol yet.
      </p>
    );
  }

  return null;
}
