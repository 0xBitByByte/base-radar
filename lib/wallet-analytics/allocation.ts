/**
 * V4-ANALYTICS-001 (Phase 6) — Allocation Analytics: comparing the first
 * and last snapshot's `topHoldings` (already `ScoredHolding[]`, already
 * computed by Portfolio Intelligence's `allocation.ts` — never
 * recalculated here). Honestly scoped to the top-5-by-value window each
 * snapshot already captured: an asset outside the top 5 the whole time
 * would never be "new" or "removed" by this comparison, and this file
 * doesn't pretend otherwise.
 */

import { historyBounds } from "@/lib/wallet-analytics/history";
import type { AllocationAnalytics, AllocationChange } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

const TOP_CHANGES_LIMIT = 5;

export function buildAllocationAnalytics(history: AutomationSnapshot[]): AllocationAnalytics {
  const { first, last } = historyBounds(history);

  if (!first || !last) {
    return {
      topChanges: [],
      newAssets: [],
      removedAssets: [],
      growingPositions: [],
      shrinkingPositions: [],
      protocolExposureChange: { from: null, to: null, changed: false },
      nativeVsStablecoinChange: { ethPctFrom: 0, ethPctTo: 0, stablecoinPctFrom: 0, stablecoinPctTo: 0 },
    };
  }

  const fromBySymbol = new Map(first.topHoldings.map((h) => [h.symbol, h.allocationPct]));
  const toBySymbol = new Map(last.topHoldings.map((h) => [h.symbol, h.allocationPct]));
  const allSymbols = new Set([...fromBySymbol.keys(), ...toBySymbol.keys()]);

  const changes: AllocationChange[] = [...allSymbols].map((symbol) => {
    const fromPct = fromBySymbol.get(symbol) ?? null;
    const toPct = toBySymbol.get(symbol) ?? null;
    const deltaPct = fromPct !== null && toPct !== null ? Math.round((toPct - fromPct) * 10) / 10 : null;
    return { symbol, fromPct, toPct, deltaPct };
  });

  const newAssets = changes.filter((c) => c.fromPct === null && c.toPct !== null).map((c) => c.symbol);
  const removedAssets = changes.filter((c) => c.toPct === null && c.fromPct !== null).map((c) => c.symbol);
  const growingPositions = changes.filter((c) => c.deltaPct !== null && c.deltaPct > 0).sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0));
  const shrinkingPositions = changes.filter((c) => c.deltaPct !== null && c.deltaPct < 0).sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0));
  const topChanges = [...changes]
    .filter((c) => c.deltaPct !== null)
    .sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0))
    .slice(0, TOP_CHANGES_LIMIT);

  return {
    topChanges,
    newAssets,
    removedAssets,
    growingPositions,
    shrinkingPositions,
    protocolExposureChange: {
      from: first.largestProtocolName,
      to: last.largestProtocolName,
      changed: first.largestProtocolName !== last.largestProtocolName,
    },
    nativeVsStablecoinChange: {
      ethPctFrom: first.ethPct,
      ethPctTo: last.ethPct,
      stablecoinPctFrom: first.stablecoinExposure,
      stablecoinPctTo: last.stablecoinExposure,
    },
  };
}
