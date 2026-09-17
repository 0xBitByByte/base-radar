/**
 * V4-AUTOMATION-001 (Phase 9) — preparation for V4-HISTORY-001. Pure
 * functions only: `buildAutomationSnapshot` reads a handful of already-
 * computed fields off one `PortfolioIntelligence`; `buildAutomationDiff`
 * compares two already-built snapshots; `buildAutomationMetadata`
 * describes one evaluation pass (rule/event counts). None of the three
 * persists anything — no `localStorage`, no database, no backend. A future
 * History module decides what (if anything) to actually store.
 */

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { CURRENT_ANALYTICS_SNAPSHOT_VERSION } from "@/lib/wallet-automation/types";
import type { AutomationDiff, AutomationMetadata, AutomationSnapshot, WalletAutomationRule, WalletEvent } from "@/lib/wallet-automation/types";
import type { AutomationResult } from "@/lib/automation/types";

export function buildAutomationSnapshot(intelligence: PortfolioIntelligence): AutomationSnapshot {
  return {
    timestamp: intelligence.lastUpdated,
    analyticsVersion: CURRENT_ANALYTICS_SNAPSHOT_VERSION,
    overallScore: intelligence.overallScore,
    healthScore: intelligence.healthScore,
    riskScore: intelligence.riskScore,
    confidenceScore: intelligence.confidenceScore,
    confidenceLevel: intelligence.confidenceLevel,
    fingerprint: intelligence.fingerprint,
    largestHoldingSymbol: intelligence.largestHolding?.symbol ?? null,
    largestProtocolName: intelligence.largestProtocol?.name ?? null,
    primaryRecommendationId: intelligence.recommendations[0]?.id ?? null,
    topWarningId: intelligence.warnings[0]?.id ?? null,
    totalValue: intelligence.totalUsdValue,
    stablecoinExposure: intelligence.stablecoinExposure,
    ethPct: intelligence.allocationBreakdown.ethPct,
    diversificationScore: intelligence.diversificationScore,
    pricingCoverage: intelligence.pricingCoverage,
    unknownAssetCount: intelligence.unknownAssetCount,
    warningIds: intelligence.warnings.map((warning) => warning.id),
    topHoldings: intelligence.allocationBreakdown.topHoldings,
  };
}

const DIFFABLE_KEYS: (keyof Omit<AutomationSnapshot, "timestamp" | "analyticsVersion" | "warningIds" | "topHoldings">)[] = [
  "overallScore",
  "healthScore",
  "riskScore",
  "confidenceScore",
  "confidenceLevel",
  "fingerprint",
  "largestHoldingSymbol",
  "largestProtocolName",
  "primaryRecommendationId",
  "topWarningId",
  "totalValue",
  "stablecoinExposure",
  "ethPct",
  "diversificationScore",
  "pricingCoverage",
  "unknownAssetCount",
];

export function buildAutomationDiff(previous: AutomationSnapshot | null, current: AutomationSnapshot): AutomationDiff {
  const changed = previous ? DIFFABLE_KEYS.filter((key) => previous[key] !== current[key]) : [];
  return { fromTimestamp: previous?.timestamp ?? null, toTimestamp: current.timestamp, changed };
}

export function buildAutomationMetadata(rules: WalletAutomationRule[], results: AutomationResult[], events: WalletEvent[], evaluatedAt: string): AutomationMetadata {
  return {
    evaluatedAt,
    ruleCount: rules.length,
    enabledRuleCount: rules.filter((rule) => rule.enabled).length,
    triggeredResultCount: results.length,
    eventCount: events.length,
  };
}
