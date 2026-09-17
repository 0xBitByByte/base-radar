import { PairCard } from "@/components/explorer/PairCard";
import type { TradingPool } from "@/lib/intelligence/types";

type PoolCardGridProps = {
  pools: TradingPool[];
  topVolumePool: TradingPool | null;
  totalLiquidityUsd: number;
  /** This project's own real token image (`market.imageUrl`). `PairCard`/`TokenLogo` fall back to `tokenLogos`, then an honest initials badge — never a fabricated logo. */
  tokenLogoUrl?: string | null;
  /** Token Logo System — one canonical resolved logo per base/quote token across these pools, keyed by address and symbol (`resolveTokenLogosForPools()`) — the same URL every page resolves for a given symbol. See `PairCard.tsx` for how a single pool's tokens are looked up from this map. */
  tokenLogos?: Record<string, string>;
};

/**
 * PR-086 — the one shared pool-card grid, extracted so `ProfilePairIntelligence`'s
 * Featured Pools and the dedicated Pool Explorer page (`PoolExplorerList`)
 * can never diverge in responsive behavior again. Before this extraction,
 * Featured Pools had already been upgraded to the adaptive 1/2/3-column
 * grid while the Pool Explorer page was still quietly left on the old
 * always-1-column `flex flex-col` layout — a real, confirmed inconsistency
 * this component fixes at the source rather than by remembering to keep
 * two copies in sync. Breakpoints unchanged from the prior pass: 1 column
 * (mobile) -> 2 (`sm:`, tablet/laptop) -> 3 (`3xl:`, this page's own real
 * `max-w-[1600px]` content-width plateau, `!`-forced to win the cascade —
 * see `globals.css`'s `--breakpoint-3xl` token for the full history of why
 * that's necessary here).
 */
export function PoolCardGrid({ pools, topVolumePool, totalLiquidityUsd, tokenLogoUrl = null, tokenLogos }: PoolCardGridProps) {
  if (pools.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-radar-light-border py-8 text-center text-sm text-radar-light-muted dark:border-white/10 dark:text-radar-muted">
        No pools match the current search and filters.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 3xl:grid-cols-3!">
      {pools.map((pool, index) => (
        <PairCard
          key={`${pool.dexId}-${pool.pairAddress ?? index}`}
          pool={pool}
          tokenLogoUrl={tokenLogoUrl}
          tokenLogos={tokenLogos}
          isTopVolume={pool === topVolumePool}
          sharePct={totalLiquidityUsd > 0 ? ((pool.liquidityUsd ?? 0) / totalLiquidityUsd) * 100 : null}
        />
      ))}
    </ul>
  );
}
