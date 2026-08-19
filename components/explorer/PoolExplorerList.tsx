import { PairCard } from "@/components/explorer/PairCard";
import type { TradingPool } from "@/lib/intelligence/types";

type PoolExplorerListProps = {
  pools: TradingPool[];
  topVolumePool: TradingPool | null;
  totalLiquidityUsd: number;
};

/**
 * PR-084.02 — a plain renderer for an already-resolved pool array (category
 * → search → DEX filter → sort all already applied by the page before this
 * receives `pools`). Renders the exact same `PairCard` PR-084.01 already
 * ships — no new visual language. Deliberately does nothing more than
 * render what it's given: a future pagination/virtualization layer slots in
 * between the resolution pipeline and this component (wrapping or slicing
 * `pools` before it reaches here) without this component or `PairCard`
 * changing.
 */
export function PoolExplorerList({ pools, topVolumePool, totalLiquidityUsd }: PoolExplorerListProps) {
  if (pools.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-radar-light-border py-8 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        No pools match the current search and filters.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {pools.map((pool, index) => (
        <PairCard
          key={`${pool.dexId}-${pool.pairAddress ?? index}`}
          pool={pool}
          isTopVolume={pool === topVolumePool}
          sharePct={totalLiquidityUsd > 0 ? ((pool.liquidityUsd ?? 0) / totalLiquidityUsd) * 100 : null}
        />
      ))}
    </ul>
  );
}
