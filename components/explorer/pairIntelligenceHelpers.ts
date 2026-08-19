/** Pure helpers for the Token Pair Intelligence section. No JSX, no I/O. */

import type { GlowBadgeColor } from "@/components/ui/GlowBadge";
import type { TradingPool } from "@/lib/intelligence/types";

/**
 * PR-084 — new, explicit, tunable thresholds with no prior precedent in this
 * codebase. `getPoolStatus` is the single place status is computed, reused
 * by both the pools table and the "Active Pools" headline stat, so there is
 * no second, drifting definition of "active" anywhere in this section. The
 * narrow `(pool) => status` signature is deliberate so a future stage can
 * swap the threshold logic below for a real scoring engine without changing
 * either call site.
 */
const LOW_LIQUIDITY_THRESHOLD_USD = 10_000;
const DEEP_LIQUIDITY_THRESHOLD_USD = 500_000;

export type PoolStatusLabel = "Unknown" | "Inactive" | "Low Liquidity" | "Deep Liquidity" | "Healthy";

export type PoolStatus = { label: PoolStatusLabel; color: GlowBadgeColor };

export function getPoolStatus(pool: TradingPool): PoolStatus {
  if (pool.liquidityUsd === null && pool.volume24hUsd === null) return { label: "Unknown", color: "muted" };
  if ((pool.volume24hUsd ?? 0) === 0) return { label: "Inactive", color: "muted" };
  if ((pool.liquidityUsd ?? 0) < LOW_LIQUIDITY_THRESHOLD_USD) return { label: "Low Liquidity", color: "warning" };
  if ((pool.liquidityUsd ?? 0) >= DEEP_LIQUIDITY_THRESHOLD_USD) return { label: "Deep Liquidity", color: "accent" };
  return { label: "Healthy", color: "success" };
}

/** Mechanical title-case of the DexScreener `dexId` slug (e.g. `"aerodrome-slipstream"` → `"Aerodrome Slipstream"`) — never a hardcoded name map, so it's correct for any DEX the provider returns, known or not. */
export function formatDexName(dexId: string): string {
  return dexId
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/** `"{base}/{quote}"` when the quote symbol is known, else the base symbol alone — never a guessed or partially-fabricated pair string. */
export function getPairLabel(pool: TradingPool): string {
  if (!pool.baseTokenSymbol) return "—";
  return pool.quoteTokenSymbol ? `${pool.baseTokenSymbol}/${pool.quoteTokenSymbol}` : pool.baseTokenSymbol;
}

/** The deepest pool's share of summed liquidity across all matched pools, in percentage points (0–100). `null` when there's nothing real to divide by. */
export function getLiquidityConcentration(pools: TradingPool[]): number | null {
  if (pools.length === 0) return null;
  const totalLiquidityUsd = pools.reduce((sum, pool) => sum + (pool.liquidityUsd ?? 0), 0);
  if (totalLiquidityUsd <= 0) return null;
  const topLiquidityUsd = Math.max(...pools.map((pool) => pool.liquidityUsd ?? 0));
  return (topLiquidityUsd / totalLiquidityUsd) * 100;
}

function getPoolAgeDays(pool: TradingPool): number | null {
  return pool.pairCreatedAt === null ? null : (Date.now() - pool.pairCreatedAt) / (24 * 60 * 60 * 1000);
}

/**
 * PR-084.01 — Base Radar's own read on a pool's maturity, not a DexScreener
 * label. Deliberately combines liquidity with age and activity rather than
 * any single number ("never classify from TVL alone") and lives entirely
 * separate from `PairCard`'s rendering: every threshold below is a named
 * constant in one place, and the exported function returns a typed result
 * object rather than pre-formatted JSX/strings — `PairCard` only ever
 * consumes `.label`, it contains none of this rule logic itself.
 */
const POOL_CLASSIFICATION_THRESHOLDS = {
  blueChip: { minLiquidityUsd: 1_000_000, minAgeDays: 365 },
  established: { minLiquidityUsd: 100_000, minAgeDays: 90 },
  growing: { minLiquidityUsd: 10_000 }, // + requires real 24h volume
  emerging: { maxAgeDays: 30 }, // + requires nonzero liquidity
} as const;

export type PoolClassificationTier = "blue-chip" | "established" | "growing" | "emerging" | "experimental";

export type PoolClassification = { tier: PoolClassificationTier; label: string };

export function getPoolClassification(pool: TradingPool): PoolClassification {
  const liquidityUsd = pool.liquidityUsd ?? 0;
  const volume24hUsd = pool.volume24hUsd ?? 0;
  const ageDays = getPoolAgeDays(pool);

  if (liquidityUsd >= POOL_CLASSIFICATION_THRESHOLDS.blueChip.minLiquidityUsd && ageDays !== null && ageDays >= POOL_CLASSIFICATION_THRESHOLDS.blueChip.minAgeDays) {
    return { tier: "blue-chip", label: "Blue Chip" };
  }
  if (
    liquidityUsd >= POOL_CLASSIFICATION_THRESHOLDS.established.minLiquidityUsd &&
    ageDays !== null &&
    ageDays >= POOL_CLASSIFICATION_THRESHOLDS.established.minAgeDays
  ) {
    return { tier: "established", label: "Established" };
  }
  if (liquidityUsd >= POOL_CLASSIFICATION_THRESHOLDS.growing.minLiquidityUsd && volume24hUsd > 0) {
    return { tier: "growing", label: "Growing" };
  }
  if (ageDays !== null && ageDays < POOL_CLASSIFICATION_THRESHOLDS.emerging.maxAgeDays && liquidityUsd > 0) {
    return { tier: "emerging", label: "Emerging" };
  }
  return { tier: "experimental", label: "Experimental" };
}

// ---------------------------------------------------------------------------
// Pool Curation Engine (PR-084.02)
//
// The one place BaseRadar decides which pools surface where. Two consumers
// by design: PR-084.01's Featured Pools (`ProfilePairIntelligence.tsx`, via
// `getPoolsForCategory(pools, "featured")`) and PR-084.02's Pool Explorer
// (every category tab) — both call the exact same function, so "Featured"
// can never mean two different things in two different places. A future
// consumer (a Pool Details "similar pools" rail, etc.) has this same one
// function to call.
//
// Every rule below reads only already-real, already-computed fields
// (`liquidityUsd`, `volume24hUsd`, `volume6hUsd`, `pairCreatedAt`,
// `getPoolStatus`, `getPoolClassification`) — no black-box scoring, no
// weighted composite the reader can't reconstruct by hand. `description` is
// the literal sentence rendered as each category's "why is this pool here"
// explanation, so the UI copy and the actual rule can never drift apart.
// ---------------------------------------------------------------------------

const STATUS_RANK: Record<PoolStatusLabel, number> = {
  Unknown: 0,
  Inactive: 0,
  "Low Liquidity": 1,
  Healthy: 2,
  "Deep Liquidity": 3,
};

const CLASSIFICATION_RANK: Record<PoolClassificationTier, number> = {
  experimental: 0,
  emerging: 1,
  growing: 2,
  established: 3,
  "blue-chip": 4,
};

/** Single source of truth for "how many pools count as Featured" — PR-084.01's Featured Pools and this file's own `"featured"` category both resolve to this one number. */
const FEATURED_POOL_COUNT = 5;
const NEW_POOL_MAX_AGE_DAYS = 30;
/** A pool's last-6-hours hourly pace must exceed its 24h average hourly pace by this multiple to count as Trending — e.g. `1.5` = at least 50% above average pace. */
const TRENDING_PACE_MULTIPLIER = 1.5;

function sortByLiquidityDesc(pools: TradingPool[]): TradingPool[] {
  return [...pools].sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
}

export type PoolCategoryId =
  | "featured"
  | "recommended"
  | "highest-liquidity"
  | "highest-volume"
  | "trending"
  | "new"
  | "blue-chip"
  | "established"
  | "growing"
  | "experimental"
  | "liquidity-risk"
  | "all";

export type PoolCategoryDefinition = {
  id: PoolCategoryId;
  emoji: string;
  label: string;
  /** The one sentence rendered as this category's "why is this pool here" explanation. */
  description: string;
  apply: (pools: TradingPool[]) => TradingPool[];
};

export const POOL_CATEGORIES: PoolCategoryDefinition[] = [
  {
    id: "featured",
    emoji: "⭐",
    label: "Featured",
    description: `The ${FEATURED_POOL_COUNT} deepest pools by liquidity — the ones most likely to matter first.`,
    apply: (pools) => sortByLiquidityDesc(pools).slice(0, FEATURED_POOL_COUNT),
  },
  {
    id: "recommended",
    emoji: "🏆",
    label: "Recommended",
    description: "Base Radar Intelligence: pools that are both Healthy (or deeper) by Pool Status and Established (or more mature) by Pool Classification — two real signals combined, not a single hidden score.",
    apply: (pools) =>
      pools.filter(
        (pool) =>
          STATUS_RANK[getPoolStatus(pool).label] >= STATUS_RANK.Healthy &&
          CLASSIFICATION_RANK[getPoolClassification(pool).tier] >= CLASSIFICATION_RANK.established
      ),
  },
  {
    id: "highest-liquidity",
    emoji: "💧",
    label: "Highest Liquidity",
    description: "Every tracked pool, ranked by liquidity depth, deepest first.",
    apply: sortByLiquidityDesc,
  },
  {
    id: "highest-volume",
    emoji: "📈",
    label: "Highest Volume",
    description: "Every tracked pool, ranked by 24h trading volume, highest first.",
    apply: (pools) => [...pools].sort((a, b) => (b.volume24hUsd ?? 0) - (a.volume24hUsd ?? 0)),
  },
  {
    id: "trending",
    emoji: "🚀",
    label: "Trending",
    description: `Pools whose last-6-hours volume pace is at least ${Math.round((TRENDING_PACE_MULTIPLIER - 1) * 100)}% above their 24h average pace — real short-term acceleration, not a guess.`,
    apply: (pools) =>
      pools.filter((pool) => {
        if (pool.volume6hUsd === null || pool.volume24hUsd === null || pool.volume24hUsd <= 0) return false;
        return pool.volume6hUsd / 6 > (pool.volume24hUsd / 24) * TRENDING_PACE_MULTIPLIER;
      }),
  },
  {
    id: "new",
    emoji: "🌱",
    label: "New",
    description: `Pools first seen trading in the last ${NEW_POOL_MAX_AGE_DAYS} days.`,
    apply: (pools) =>
      pools.filter((pool) => {
        const ageDays = getPoolAgeDays(pool);
        return ageDays !== null && ageDays <= NEW_POOL_MAX_AGE_DAYS;
      }),
  },
  {
    id: "blue-chip",
    emoji: "💎",
    label: "Blue Chip",
    description: `Base Radar Classification: deep, long-established liquidity (≥$${(POOL_CLASSIFICATION_THRESHOLDS.blueChip.minLiquidityUsd / 1_000_000).toFixed(0)}M, ${POOL_CLASSIFICATION_THRESHOLDS.blueChip.minAgeDays}+ days old).`,
    apply: (pools) => pools.filter((pool) => getPoolClassification(pool).tier === "blue-chip"),
  },
  {
    id: "established",
    emoji: "🏛",
    label: "Established",
    description: `Base Radar Classification: real liquidity with a proven track record (≥$${(POOL_CLASSIFICATION_THRESHOLDS.established.minLiquidityUsd / 1_000).toFixed(0)}K, ${POOL_CLASSIFICATION_THRESHOLDS.established.minAgeDays}+ days old).`,
    apply: (pools) => pools.filter((pool) => getPoolClassification(pool).tier === "established"),
  },
  {
    id: "growing",
    emoji: "🌿",
    label: "Growing",
    description: "Base Radar Classification: real liquidity and real trading activity, still building a track record.",
    apply: (pools) => pools.filter((pool) => getPoolClassification(pool).tier === "growing"),
  },
  {
    id: "experimental",
    emoji: "🧪",
    label: "Experimental",
    description: "Base Radar Classification: thin, brand-new, or unproven — the lowest-confidence tier.",
    apply: (pools) => pools.filter((pool) => getPoolClassification(pool).tier === "experimental"),
  },
  {
    id: "liquidity-risk",
    emoji: "⚠️",
    label: "Liquidity Risk",
    description: "Base Radar Intelligence: pools currently Low Liquidity or Inactive by Pool Status — a market-depth read from real numbers, not a security or contract-risk assessment.",
    apply: (pools) => pools.filter((pool) => getPoolStatus(pool).label === "Low Liquidity" || getPoolStatus(pool).label === "Inactive"),
  },
  {
    id: "all",
    emoji: "📋",
    label: "All Pools",
    description: "Every real pool Base Radar has matched for this token, unfiltered.",
    apply: (pools) => pools,
  },
];

const POOL_CATEGORY_BY_ID = new Map(POOL_CATEGORIES.map((category) => [category.id, category]));

export function getPoolsForCategory(pools: TradingPool[], categoryId: PoolCategoryId): TradingPool[] {
  return (POOL_CATEGORY_BY_ID.get(categoryId) ?? POOL_CATEGORY_BY_ID.get("all"))!.apply(pools);
}
