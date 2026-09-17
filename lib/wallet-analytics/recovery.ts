/**
 * V4-ANALYTICS-001A (Phase 7) — Recovery Analysis: real poor-state →
 * recovered transitions detected by walking consecutive real snapshots.
 * "Poor state" thresholds reuse the same, already-established codebase
 * conventions rather than inventing new ones:
 *   - `WalletIntelligenceSections.tsx`'s own `scoreColorClass` tri-band
 *     (bad ≤33 / good ≥67, inverted for Risk) for Risk/Confidence/
 *     Diversification.
 *   - `lib/portfolio-intelligence/risk.ts`'s own `concentrationLevel`
 *     "high" threshold (topHoldingPct ≥ 75) for Heavy Concentration.
 *   - `lib/portfolio-intelligence/risk.ts`'s own `LOW_PRICING_COVERAGE_THRESHOLD`
 *     (70) for Low Pricing Coverage.
 *   - `unknownAssetCount > 0` for Unknown Assets — any real unpriced asset.
 * Every transition cites the real bracketing snapshots — never inferred
 * from a gap, never fabricated.
 */

import type { RecoveryCategory, RecoveryEvent } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

const POOR_BAND_THRESHOLD = 33;
const GOOD_BAND_THRESHOLD = 67;
const HEAVY_CONCENTRATION_THRESHOLD_PCT = 75;
const LOW_PRICING_COVERAGE_THRESHOLD = 70;

function topHoldingPct(snapshot: AutomationSnapshot): number {
  return snapshot.topHoldings[0]?.allocationPct ?? 0;
}

type RecoveryDefinition = { category: RecoveryCategory; label: string; read: (s: AutomationSnapshot) => number; isPoor: (value: number) => boolean };

const RECOVERY_DEFINITIONS: RecoveryDefinition[] = [
  { category: "highRisk", label: "High Risk", read: (s) => s.riskScore, isPoor: (v) => v >= GOOD_BAND_THRESHOLD },
  { category: "lowConfidence", label: "Low Confidence", read: (s) => s.confidenceScore, isPoor: (v) => v <= POOR_BAND_THRESHOLD },
  { category: "poorDiversification", label: "Poor Diversification", read: (s) => s.diversificationScore, isPoor: (v) => v <= POOR_BAND_THRESHOLD },
  { category: "heavyConcentration", label: "Heavy Concentration", read: topHoldingPct, isPoor: (v) => v >= HEAVY_CONCENTRATION_THRESHOLD_PCT },
  { category: "unknownAssets", label: "Unknown Assets", read: (s) => s.unknownAssetCount, isPoor: (v) => v > 0 },
  { category: "lowPricingCoverage", label: "Low Pricing Coverage", read: (s) => s.pricingCoverage, isPoor: (v) => v < LOW_PRICING_COVERAGE_THRESHOLD },
];

function detectRecoveries(history: AutomationSnapshot[], definition: RecoveryDefinition): RecoveryEvent[] {
  const events: RecoveryEvent[] = [];
  let poorEntry: AutomationSnapshot | null = null;

  for (const snapshot of history) {
    const value = definition.read(snapshot);
    const poor = definition.isPoor(value);
    if (poor && !poorEntry) {
      poorEntry = snapshot;
    } else if (!poor && poorEntry) {
      const before = poorEntry;
      const after = snapshot;
      const durationDays = (new Date(after.timestamp).getTime() - new Date(before.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      events.push({
        category: definition.category,
        label: definition.label,
        recoveryDate: after.timestamp,
        before: { value: definition.read(before), timestamp: before.timestamp },
        after: { value: definition.read(after), timestamp: after.timestamp },
        improvement: Math.round(Math.abs(definition.read(after) - definition.read(before)) * 10) / 10,
        durationDays: Math.round(durationDays * 10) / 10,
      });
      poorEntry = null;
    }
  }

  return events;
}

/** Requires at least 2 snapshots — a single point in time can't contain a "before → after" transition. Returns every real recovery found, sorted chronologically by recovery date; an empty array when history is too short or nothing ever recovered. */
export function buildRecoveryAnalysis(history: AutomationSnapshot[]): RecoveryEvent[] {
  if (history.length < 2) return [];
  return RECOVERY_DEFINITIONS.flatMap((definition) => detectRecoveries(history, definition)).sort((a, b) => a.recoveryDate.localeCompare(b.recoveryDate));
}
