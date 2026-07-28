/**
 * PR-063 — Task 1/2/4/7: deterministic financial range filtering + summary
 * stats over a `LiveProject[]`. Mirrors `filter.ts`/`sort.ts`'s own shape —
 * pure functions, no I/O, no UI. The range boundaries below are the only
 * hand-chosen constants in this module; which projects fall into a given
 * range is always computed here, at request time, off each project's real
 * `market.*` field — never a hardcoded per-project membership list.
 */

import { FINANCIAL_METRICS, type FinancialMetric, type FinancialRangeDef, type FinancialRangeId, type LiveProject } from "@/lib/projects/types";
import type { ProviderName } from "@/lib/providers/common/types";

export const FINANCIAL_RANGES: Record<FinancialMetric, FinancialRangeDef[]> = {
  tvl: [
    { id: "tvl-under-1m", metric: "tvl", label: "< $1M", min: null, max: 1_000_000 },
    { id: "tvl-1m-10m", metric: "tvl", label: "$1M – $10M", min: 1_000_000, max: 10_000_000 },
    { id: "tvl-10m-100m", metric: "tvl", label: "$10M – $100M", min: 10_000_000, max: 100_000_000 },
    { id: "tvl-over-100m", metric: "tvl", label: "> $100M", min: 100_000_000, max: null },
  ],
  liquidity: [
    { id: "liquidity-under-500k", metric: "liquidity", label: "< $500K", min: null, max: 500_000 },
    { id: "liquidity-500k-5m", metric: "liquidity", label: "$500K – $5M", min: 500_000, max: 5_000_000 },
    { id: "liquidity-over-5m", metric: "liquidity", label: "> $5M", min: 5_000_000, max: null },
  ],
  marketCap: [
    { id: "marketCap-small", metric: "marketCap", label: "Small (< $10M)", min: null, max: 10_000_000 },
    { id: "marketCap-mid", metric: "marketCap", label: "Mid ($10M – $1B)", min: 10_000_000, max: 1_000_000_000 },
    { id: "marketCap-large", metric: "marketCap", label: "Large (> $1B)", min: 1_000_000_000, max: null },
  ],
  volume: [
    { id: "volume-low", metric: "volume", label: "Low (< $100K)", min: null, max: 100_000 },
    { id: "volume-medium", metric: "volume", label: "Medium ($100K – $10M)", min: 100_000, max: 10_000_000 },
    { id: "volume-high", metric: "volume", label: "High (> $10M)", min: 10_000_000, max: null },
  ],
};

/** O(1) id → def lookup, built once from `FINANCIAL_RANGES`. */
const RANGE_BY_ID: Map<FinancialRangeId, FinancialRangeDef> = new Map(
  FINANCIAL_METRICS.flatMap((metric) => FINANCIAL_RANGES[metric]).map((def) => [def.id, def])
);

/** Which provider resolves each financial metric — Task 7: never merge incompatible provider values into one filter or figure. */
export const FINANCIAL_METRIC_PROVIDER: Record<FinancialMetric, ProviderName> = {
  tvl: "defillama",
  liquidity: "dexscreener",
  marketCap: "coingecko",
  volume: "dexscreener",
};

export function financialRangeDef(id: FinancialRangeId): FinancialRangeDef | undefined {
  return RANGE_BY_ID.get(id);
}

export function valueForFinancialMetric(project: LiveProject, metric: FinancialMetric): number | null {
  switch (metric) {
    case "tvl":
      return project.market.tvlUsd;
    case "liquidity":
      return project.market.liquidityUsd;
    case "marketCap":
      return project.market.marketCapUsd;
    case "volume":
      return project.market.volume24hUsd;
  }
}

/** A project with no real value for this range's metric never matches — a `null` is "no data," not "below every threshold." */
export function matchesFinancialRange(project: LiveProject, rangeId: FinancialRangeId): boolean {
  const def = financialRangeDef(rangeId);
  if (!def) return false;
  const value = valueForFinancialMetric(project, def.metric);
  if (value === null) return false;
  if (def.min !== null && value < def.min) return false;
  if (def.max !== null && value >= def.max) return false;
  return true;
}

/** Task 1 — whether this metric has real, live data anywhere in `projects`. Computed over the full, unfiltered registry, the same rule `components/projects/filterOptions.ts` already uses for Discovery/Verification Status. */
export function hasReliableFinancialData(projects: LiveProject[], metric: FinancialMetric): boolean {
  return projects.some((project) => valueForFinancialMetric(project, metric) !== null);
}

/** Every metric with at least one real value anywhere in `projects` — drives which financial filter sections the panel renders at all. */
export function availableFinancialMetrics(projects: LiveProject[]): FinancialMetric[] {
  return FINANCIAL_METRICS.filter((metric) => hasReliableFinancialData(projects, metric));
}

/** Never offer a bucket with zero real matches — same "never offer an option with zero real matches" rule `filterOptions.ts` already establishes for Discovery/Verification Status. */
export function availableFinancialRanges(projects: LiveProject[], metric: FinancialMetric): FinancialRangeDef[] {
  return FINANCIAL_RANGES[metric].filter((def) => projects.some((project) => matchesFinancialRange(project, def.id)));
}

export type FinancialSummary = {
  metric: FinancialMetric;
  count: number;
  highest: number;
  average: number;
  total: number;
};

/**
 * Task 4 — contextual stats for the active financial filter, computed only
 * from `projects` (the already-filtered, currently-visible set — never the
 * full registry) and only from real, non-null values for `metric`. Returns
 * `null` when nothing in `projects` carries real data for `metric` — never a
 * fabricated zero.
 */
export function computeFinancialSummary(projects: LiveProject[], metric: FinancialMetric): FinancialSummary | null {
  const values = projects.map((project) => valueForFinancialMetric(project, metric)).filter((value): value is number => value !== null);
  if (values.length === 0) return null;

  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    metric,
    count: values.length,
    highest: Math.max(...values),
    average: total / values.length,
    total,
  };
}
