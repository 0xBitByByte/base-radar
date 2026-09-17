/**
 * V4-ANALYTICS-001 (Phase 5) — Portfolio Evolution: the "most notable real
 * facts" across a snapshot history. Every field can honestly be `null` —
 * this module never guesses a runner-up when the real answer is "there
 * isn't one to report."
 *
 * `mostVolatileAllocation` is ALWAYS `null` today: `AutomationSnapshot`
 * carries a single largest-holding symbol and up to 5 `topHoldings` per
 * point in time, not a full per-asset value time series — there's no
 * honest way to rank "most volatile" without that richer history. Returning
 * `null` here (rather than a misleading proxy) is the deliberate, correct
 * choice per this phase's own "if data doesn't exist, return null" rule.
 */

import { buildTrends } from "@/lib/wallet-analytics/trend";
import type { EvolutionFinding, PortfolioEvolution } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

function largestScoreMove(history: AutomationSnapshot[], wantImproving: boolean): EvolutionFinding {
  const trends = buildTrends(history).filter((t) => t.metric !== "value" && t.delta !== null);
  const candidates = trends.filter((t) => t.direction === (wantImproving ? "improving" : "declining"));
  if (candidates.length === 0) return null;

  const best = candidates.reduce((max, t) => (Math.abs(t.delta ?? 0) > Math.abs(max.delta ?? 0) ? t : max));
  return { metric: best.metric, label: best.label, detail: best.reason, value: best.delta ?? 0 };
}

function biggestAllocationShift(history: AutomationSnapshot[]): EvolutionFinding {
  if (history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];

  const stablecoinDelta = Math.abs(last.stablecoinExposure - first.stablecoinExposure);
  const ethDelta = Math.abs(last.ethPct - first.ethPct);
  if (stablecoinDelta === 0 && ethDelta === 0) return null;

  return stablecoinDelta >= ethDelta
    ? { metric: "stablecoinExposure", label: "Stablecoin Allocation", detail: `Stablecoin allocation moved from ${first.stablecoinExposure.toFixed(1)}% to ${last.stablecoinExposure.toFixed(1)}%.`, value: Math.round((last.stablecoinExposure - first.stablecoinExposure) * 10) / 10 }
    : { metric: "ethPct", label: "ETH Allocation", detail: `ETH allocation moved from ${first.ethPct.toFixed(1)}% to ${last.ethPct.toFixed(1)}%.`, value: Math.round((last.ethPct - first.ethPct) * 10) / 10 };
}

function mostStableAsset(history: AutomationSnapshot[]): EvolutionFinding {
  if (history.length === 0) return null;
  const symbols = new Set(history.map((s) => s.largestHoldingSymbol));
  if (symbols.size !== 1) return null;
  const [symbol] = symbols;
  if (!symbol) return null;
  return { metric: "largestHoldingSymbol", label: "Most Stable Asset", detail: `${symbol} was your largest holding across all ${history.length} snapshot${history.length === 1 ? "" : "s"}.`, value: symbol };
}

/**
 * V4-ANALYTICS-001A (Phase 6) — generic longest-consecutive-run finder,
 * extracted from what was originally `longestUnchangedRecommendation`'s own
 * inline algorithm so `personalBests.ts`'s "Longest Stable Portfolio" (keyed
 * on `fingerprint` instead of `primaryRecommendationId`) can reuse the exact
 * same real algorithm rather than re-implementing it — "reuse, don't
 * duplicate calculations."
 */
export function longestConsecutiveRun<T>(history: AutomationSnapshot[], read: (snapshot: AutomationSnapshot) => T): { value: T; runLength: number; startIndex: number; endIndex: number } | null {
  if (history.length === 0) return null;

  let bestValue: T | null = null;
  let bestRun = 0;
  let bestStart = 0;
  let currentValue: T | null = null;
  let currentRun = 0;
  let currentStart = 0;

  history.forEach((snapshot, i) => {
    const value = read(snapshot);
    if (value === currentValue) {
      currentRun += 1;
    } else {
      currentValue = value;
      currentRun = 1;
      currentStart = i;
    }
    if (currentRun > bestRun) {
      bestRun = currentRun;
      bestValue = currentValue;
      bestStart = currentStart;
    }
  });

  if (bestValue === null || bestRun < 2) return null;
  return { value: bestValue, runLength: bestRun, startIndex: bestStart, endIndex: bestStart + bestRun - 1 };
}

function longestUnchangedRecommendation(history: AutomationSnapshot[]): EvolutionFinding {
  const run = longestConsecutiveRun(history, (s) => s.primaryRecommendationId);
  if (!run || !run.value) return null;
  const start = history[run.startIndex];
  const end = history[run.endIndex];
  return {
    metric: "primaryRecommendationId",
    label: "Longest Unchanged Recommendation",
    detail: `"${run.value}" stayed your top recommendation for ${run.runLength} consecutive snapshots (${start.timestamp} to ${end.timestamp}).`,
    value: run.runLength,
  };
}

function mostRepeatedWarning(history: AutomationSnapshot[]): EvolutionFinding {
  const counts = new Map<string, number>();
  for (const snapshot of history) {
    if (!snapshot.topWarningId) continue;
    counts.set(snapshot.topWarningId, (counts.get(snapshot.topWarningId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const [id, count] = [...counts.entries()].reduce((max, entry) => (entry[1] > max[1] ? entry : max));
  if (count < 2) return null;
  return { metric: "topWarningId", label: "Most Repeated Warning", detail: `"${id}" was your top warning in ${count} of ${history.length} snapshots.`, value: count };
}

export function buildPortfolioEvolution(history: AutomationSnapshot[]): PortfolioEvolution {
  return {
    largestImprovement: largestScoreMove(history, true),
    largestDeterioration: largestScoreMove(history, false),
    biggestAllocationShift: biggestAllocationShift(history),
    mostStableAsset: mostStableAsset(history),
    mostVolatileAllocation: null,
    longestUnchangedRecommendation: longestUnchangedRecommendation(history),
    mostRepeatedWarning: mostRepeatedWarning(history),
  };
}
