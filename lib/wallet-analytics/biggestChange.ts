/**
 * V4-ANALYTICS-002 / V4-ANALYTICS-001A (Phase 4) — the single most
 * significant real portfolio change. Reuses `buildTrends()`'s already-
 * computed output and `buildAllocationAnalytics()`'s already-computed
 * `nativeVsStablecoinChange` (never a new calculation, never re-reads
 * snapshots itself). Ranked by a normalized magnitude so score-scale
 * metrics (0-100), the dollar-scale Portfolio Value trend, and the
 * percentage-scale ETH Allocation figure can be compared fairly: score
 * metrics rank by raw `|delta|`; Portfolio Value ranks by `|delta / from|`
 * as a percentage — the same ratio `trend.ts`'s own Portfolio Value
 * classification already uses, not a new invented threshold. ETH Allocation
 * (added this phase, since a real allocation-mix shift like "ETH 64% → 82%"
 * has no representation among `buildTrends()`'s 8 scalar metrics — only
 * Stablecoin Allocation is tracked there) ranks by raw percentage-point
 * `|delta|`, reusing the same `SCORE_CHANGE_THRESHOLD` "is this a real
 * move" bar Wallet Automation's own triggers already use.
 *
 * Recommendation/Fingerprint are excluded from ranking — a category flip
 * has no "how big" the way a score delta does — but a real Recommendation
 * change is still reflected honestly in `affectedScores.recommendation`.
 *
 * `null` whenever no candidate actually moved enough to count, per "never
 * guess."
 */

import type { AllocationAnalytics, BiggestChangeSupportingMetric, BiggestPortfolioChange, Trend } from "@/lib/wallet-analytics/types";
import { SCORE_CHANGE_THRESHOLD } from "@/lib/wallet-automation/triggers";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

const RANKED_TREND_METRICS = new Set(["health", "confidence", "risk", "diversification", "stablecoinAllocation", "value"]);

type Candidate = { metric: string; label: string; magnitude: number; reason: string; from: number; to: number };

function normalizedTrendMagnitude(trend: Trend): number {
  if (trend.metric === "value" && typeof trend.from === "number" && trend.from !== 0) {
    return Math.abs((trend.delta ?? 0) / trend.from) * 100;
  }
  return Math.abs(trend.delta ?? 0);
}

function moved(trend: Trend | undefined): boolean {
  return trend?.direction === "improving" || trend?.direction === "declining";
}

function ethAllocationCandidate(allocation: AllocationAnalytics): Candidate | null {
  const { ethPctFrom, ethPctTo } = allocation.nativeVsStablecoinChange;
  const delta = Math.round((ethPctTo - ethPctFrom) * 10) / 10;
  if (Math.abs(delta) < SCORE_CHANGE_THRESHOLD) return null;
  return {
    metric: "ethAllocation",
    label: "ETH Allocation",
    magnitude: Math.abs(delta),
    reason: `ETH allocation moved from ${ethPctFrom.toFixed(1)}% to ${ethPctTo.toFixed(1)}% (${delta >= 0 ? "+" : ""}${delta}%).`,
    from: ethPctFrom,
    to: ethPctTo,
  };
}

export function buildBiggestChange(trends: Trend[], allocation: AllocationAnalytics, history: AutomationSnapshot[]): BiggestPortfolioChange {
  const trendCandidates: Candidate[] = trends
    .filter((trend) => RANKED_TREND_METRICS.has(trend.metric) && moved(trend))
    .map((trend) => ({
      metric: trend.metric,
      label: trend.label,
      magnitude: normalizedTrendMagnitude(trend),
      reason: trend.reason,
      from: typeof trend.from === "number" ? trend.from : 0,
      to: typeof trend.to === "number" ? trend.to : 0,
    }));

  const eth = ethAllocationCandidate(allocation);
  const candidates = eth ? [...trendCandidates, eth] : trendCandidates;
  if (candidates.length === 0) return null;

  const biggest = candidates.reduce((max, c) => (c.magnitude > max.magnitude ? c : max));
  const byMetric = new Map(trends.map((trend) => [trend.metric, trend]));

  const supportingMetrics: BiggestChangeSupportingMetric[] = trends
    .filter((trend) => trend.metric !== biggest.metric && (trend.direction === "improving" || trend.direction === "declining"))
    .map((trend) => ({ metric: trend.metric, label: trend.label, from: trend.from, to: trend.to }));

  const first = history[0];
  const last = history[history.length - 1];

  return {
    metric: biggest.metric,
    category: biggest.label,
    magnitude: Math.round(biggest.magnitude * 10) / 10,
    description: `${biggest.label} was your biggest portfolio change: ${biggest.reason}`,
    primaryCause: biggest.reason,
    affectedScores: {
      health: moved(byMetric.get("health")),
      confidence: moved(byMetric.get("confidence")),
      risk: moved(byMetric.get("risk")),
      recommendation: byMetric.get("recommendation")?.direction === "unknown",
    },
    supportingMetrics,
    timePeriod: first && last ? { from: first.timestamp, to: last.timestamp } : null,
  };
}
