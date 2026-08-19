import { ArrowRight, Waypoints } from "lucide-react";
import Link from "next/link";

import { MetricItem } from "@/components/explorer/MetricItem";
import { PairCard } from "@/components/explorer/PairCard";
import { formatDexName, getPoolsForCategory, getPoolStatus } from "@/components/explorer/pairIntelligenceHelpers";
import { ProfileSectionCard } from "@/components/explorer/ProfileSectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCompactCurrency, formatCompactNumber, formatPercent } from "@/lib/data/format";
import type { TradingPool } from "@/lib/intelligence/types";

type ProfilePairIntelligenceProps = {
  pools: TradingPool[];
  tokenSymbol: string | null;
  /** PR-084.02 — the real Pool Explorer route for this project (`/dashboard/projects/{slug}/pools`), built once in `page.tsx` from `slug`. */
  poolsHref: string;
};

/**
 * PR-084 Stage 1 / PR-084.01 — fills the Token Pairs slot `page.tsx` has
 * reserved since PR-080. Answers exactly four trader questions: where should
 * I trade (each card's pair + DEX), which pool is deepest (Best Liquidity
 * Pool), which is most active (Highest Volume Pool), how concentrated is
 * liquidity. `pools` arrives already resolved by `page.tsx` — either the
 * richer, real multi-pool `getPairsForToken` result, or (on a cache miss's
 * fallback) the original single-pool `trading.pools` — this component has no
 * opinion on which, it just renders whatever real pools it's given.
 */
export function ProfilePairIntelligence({ pools, tokenSymbol, poolsHref }: ProfilePairIntelligenceProps) {
  if (pools.length === 0) {
    return (
      <ProfileSectionCard id="trading" title="Token Pair Intelligence" icon={Waypoints}>
        <EmptyState
          icon={Waypoints}
          title="No tracked pools"
          description={`No live DexScreener pairs are currently matched for ${tokenSymbol ?? "this token"}.`}
        />
      </ProfileSectionCard>
    );
  }

  // Each derived value computed once here and reused below (and passed into
  // `PairCard`) rather than re-sorted/re-reduced per consumer — see the
  // plan's "Performance" note. `pools` is already liquidity-sorted upstream
  // (both `mergeTrading` and `getPairsForToken` guarantee this), so
  // `bestLiquidityPool` needs no extra sort.
  const bestLiquidityPool = pools[0];
  const highestVolumePool = [...pools].sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0))[0];
  const totalLiquidityUsd = pools.reduce((sum, pool) => sum + (pool.liquidityUsd ?? 0), 0);
  const concentrationPct =
    totalLiquidityUsd > 0 && bestLiquidityPool.liquidityUsd !== null ? (bestLiquidityPool.liquidityUsd / totalLiquidityUsd) * 100 : null;
  const activePoolCount = pools.filter((pool) => getPoolStatus(pool).label !== "Inactive").length;
  // PR-084.02 — Featured Pools now resolves through the shared Pool Curation
  // Engine (`getPoolsForCategory(pools, "featured")`) instead of a
  // component-local slice, so this and the Pool Explorer's own "Featured"
  // tab can never define "featured" two different ways.
  const featuredPools = getPoolsForCategory(pools, "featured");

  return (
    <ProfileSectionCard id="trading" title="Token Pair Intelligence" icon={Waypoints}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricItem
          label="Best Liquidity Pool"
          value={
            bestLiquidityPool.liquidityUsd !== null
              ? `${formatCompactCurrency(bestLiquidityPool.liquidityUsd)} · ${formatDexName(bestLiquidityPool.dexId)}`
              : undefined
          }
          emphasize
        />
        <MetricItem
          label="Highest Volume Pool"
          value={
            highestVolumePool.volume24hUsd !== null
              ? `${formatCompactCurrency(highestVolumePool.volume24hUsd)} · ${formatDexName(highestVolumePool.dexId)}`
              : undefined
          }
          emphasize
        />
        <MetricItem label="Active Pools" value={`${activePoolCount} / ${pools.length}`} emphasize />
        <MetricItem
          label="Liquidity Concentration"
          value={concentrationPct !== null ? formatPercent(concentrationPct, { showSign: false }) : undefined}
          infoTooltip="Share of total tracked liquidity held by the single deepest pool."
          emphasize
        />
      </div>
      <span className="text-[10px] font-semibold tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Featured Pools</span>
      <ul className="flex flex-col gap-2">
        {featuredPools.map((pool, index) => (
          <PairCard
            key={`${pool.dexId}-${pool.pairAddress ?? index}`}
            pool={pool}
            isTopVolume={pool === highestVolumePool}
            sharePct={totalLiquidityUsd > 0 ? ((pool.liquidityUsd ?? 0) / totalLiquidityUsd) * 100 : null}
          />
        ))}
      </ul>
      {pools.length > featuredPools.length && (
        <Link
          href={poolsHref}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-radar-light-border py-2 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:border-radar-primary/40 hover:text-radar-primary focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:text-radar-muted dark:hover:border-radar-accent/40 dark:hover:text-radar-accent"
        >
          View All Pools ({formatCompactNumber(pools.length)})
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </ProfileSectionCard>
  );
}
