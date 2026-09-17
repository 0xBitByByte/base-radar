import { PoolCardGrid } from "@/components/explorer/PoolCardGrid";
import type { TradingPool } from "@/lib/intelligence/types";

type PoolExplorerListProps = {
  pools: TradingPool[];
  topVolumePool: TradingPool | null;
  totalLiquidityUsd: number;
  /** This project's own real token image, resolved by the page and passed straight through to `PoolCardGrid`. */
  tokenLogoUrl?: string | null;
  /** Token Logo System — one canonical resolved logo per base/quote token across these pools (`resolveTokenLogosForPools()`), resolved by the page and passed straight through. */
  tokenLogos?: Record<string, string>;
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
 *
 * PR-086 — now delegates to `PoolCardGrid`, the same shared grid
 * `ProfilePairIntelligence`'s Featured Pools uses, instead of its own
 * separate `flex flex-col` list — a real, confirmed divergence (this page
 * was still 1-column-always while Featured Pools had already moved to the
 * adaptive 1/2/3-column layout) fixed by removing the second copy, not by
 * duplicating the fix.
 *
 * Token Logo System — `tokenLogoUrl`/`tokenLogos` are resolved by the page
 * (`app/dashboard/projects/[slug]/pools/page.tsx`) and passed straight
 * through; this component has no opinion on how they were resolved,
 * matching this file's existing "renders whatever it's given" philosophy.
 */
export function PoolExplorerList({ pools, topVolumePool, totalLiquidityUsd, tokenLogoUrl, tokenLogos }: PoolExplorerListProps) {
  return (
    <PoolCardGrid
      pools={pools}
      topVolumePool={topVolumePool}
      totalLiquidityUsd={totalLiquidityUsd}
      tokenLogoUrl={tokenLogoUrl}
      tokenLogos={tokenLogos}
    />
  );
}
