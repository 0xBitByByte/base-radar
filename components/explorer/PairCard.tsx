import { ExternalLink } from "lucide-react";

import { CopyButton } from "@/components/ui/CopyButton";
import { GlowBadge } from "@/components/ui/GlowBadge";
import { formatCompactCurrency, formatPercent, formatRelativeTime } from "@/lib/data/format";
import { formatDexName, getPairLabel, getPoolClassification, getPoolStatus } from "@/components/explorer/pairIntelligenceHelpers";
import type { TradingPool } from "@/lib/intelligence/types";

type PairCardProps = {
  pool: TradingPool;
  /** Computed once by the parent (one sort over the whole array) and compared by reference here — never re-derived per card. */
  isTopVolume: boolean;
  /** This pool's share of total liquidity across all matched pools, computed once by the parent. `null` when there's nothing real to divide by. */
  sharePct: number | null;
};

/**
 * One pool, one bordered card — mirrors `GovernanceList.tsx`'s stacked-card
 * recipe (`rounded-xl border ... p-3`), not a table row. Four small tiers,
 * largest-to-smallest, each its own flex row using the same label/value
 * pattern already established elsewhere on this page — a future stage's
 * APR/Rewards/Fee-Tier fields slot in as one more row in that same pattern,
 * not a restructure.
 */
export function PairCard({ pool, isTopVolume, sharePct }: PairCardProps) {
  const status = getPoolStatus(pool);
  const classification = getPoolClassification(pool);

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-radar-light-border bg-radar-light-surface p-3 dark:border-white/10 dark:bg-white/[0.02]">
      {/* Tier 1 — largest: the pair itself + Status */}
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-bold text-radar-light-text dark:text-radar-white">{getPairLabel(pool)}</span>
        <GlowBadge color={status.color} className="shrink-0 px-2 py-0.5 text-[10px]">
          {status.label}
        </GlowBadge>
      </div>

      {/* Tier 2 — Liquidity / 24H Volume, emphasized */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">Liquidity</span>
          <span className="text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white">
            {pool.liquidityUsd !== null ? formatCompactCurrency(pool.liquidityUsd) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-wide text-radar-light-muted uppercase dark:text-radar-muted">24H Volume</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tabular-nums text-radar-light-text dark:text-radar-white">
              {pool.volume24hUsd !== null ? formatCompactCurrency(pool.volume24hUsd) : "—"}
            </span>
            {isTopVolume && (
              <GlowBadge color="primary" className="px-1.5 py-0.5 text-[9px]">
                Top
              </GlowBadge>
            )}
          </div>
        </div>
      </div>

      {/* Tier 3 — DEX / Pool Age / Liquidity Share, small and muted */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-radar-light-muted dark:text-radar-muted">
        <span>{formatDexName(pool.dexId)}</span>
        <span>{pool.pairCreatedAt !== null ? formatRelativeTime(new Date(pool.pairCreatedAt).toISOString()) : "Age unavailable"}</span>
        {sharePct !== null && <span>{formatPercent(sharePct, { showSign: false })} of total liquidity</span>}
      </div>

      {/* Tier 4 — smallest: Base Radar's own read + real-data-only actions */}
      <div className="flex items-center justify-between gap-3 border-t border-radar-light-border pt-2 dark:border-white/10">
        <span className="text-[10px] font-medium text-radar-primary dark:text-radar-accent">Base Radar: {classification.label}</span>
        <div className="flex shrink-0 items-center gap-2">
          {pool.pairAddress && <CopyButton value={pool.pairAddress} label="pool contract address" />}
          {pool.url && (
            <a
              href={pool.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View on DexScreener"
              className="text-radar-light-muted/70 outline-none transition-colors hover:text-radar-light-muted focus-visible:text-radar-light-muted dark:text-radar-muted/60 dark:hover:text-radar-muted dark:focus-visible:text-radar-muted"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
