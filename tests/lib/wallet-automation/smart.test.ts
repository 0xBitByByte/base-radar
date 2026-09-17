import { describe, expect, it } from "vitest";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { buildSmartWalletAutomationResults, buildWalletAutomationResults } from "@/lib/wallet-automation/engine";
import { buildPortfolioContentEvents, buildSmartPortfolioEvents } from "@/lib/wallet-automation/events";
import { DEFAULT_WALLET_AUTOMATION_RULES } from "@/lib/wallet-automation/rules";
import * as smartTriggers from "@/lib/wallet-automation/smartTriggers";
import { buildAutomationDiff, buildAutomationMetadata, buildAutomationSnapshot } from "@/lib/wallet-automation/snapshot";
import { buildHealthChangeCopy, buildSmartContentEventCopy } from "@/lib/wallet-automation/summary";
import { WALLET_EVENT_KINDS } from "@/lib/wallet-automation/types";

function intel(overrides: Partial<PortfolioIntelligence> = {}): PortfolioIntelligence {
  return {
    overallScore: 60,
    riskScore: 30,
    diversificationScore: 70,
    healthScore: 65,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    totalUsdValue: 10000,
    largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 },
    largestProtocol: null,
    stablecoinExposure: 20,
    defiExposure: 30,
    concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" },
    recommendations: [],
    warnings: [],
    opportunities: [],
    summary: "",
    lastUpdated: "2026-09-04T00:00:00.000Z",
    healthBreakdown: [],
    quality: {
      verifiedAssetCount: 0,
      unverifiedAssetCount: 0,
      notCheckedAssetCount: 0,
      protocolsDetected: 0,
      diversificationRating: "Fair",
      diversificationRatingReason: "",
    },
    allocationBreakdown: {
      topHoldings: [],
      stablecoinPct: 20,
      ethPct: 50,
      otherPct: 30,
      unknownAssetPct: 0,
      protocolConcentrationPct: 0,
      largestProtocolName: null,
    },
    positiveContributors: [],
    negativeContributors: [],
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Mixed",
    fingerprintReason: "",
    executiveSummary: "",
    ...overrides,
  };
}

const ENABLED_RULES = DEFAULT_WALLET_AUTOMATION_RULES;

describe("smartTriggers.ts — edge-triggered, previous:null never fires", () => {
  const current = intel();
  it("every smart predicate returns false when previous is null", () => {
    expect(smartTriggers.confidenceIncreased(null, current)).toBe(false);
    expect(smartTriggers.confidenceDropped(null, current)).toBe(false);
    expect(smartTriggers.fingerprintChanged(null, current)).toBe(false);
    expect(smartTriggers.primaryRecommendationChanged(null, current)).toBe(false);
    expect(smartTriggers.riskScoreIncreased(null, current)).toBe(false);
    expect(smartTriggers.riskScoreDecreased(null, current)).toBe(false);
    expect(smartTriggers.largestProtocolChanged(null, current)).toBe(false);
    expect(smartTriggers.topContributorChanged(null, current)).toBe(false);
    expect(smartTriggers.topWarningChanged(null, current)).toBe(false);
  });

  it("a refresh with no real change fires nothing", () => {
    const snapshot = intel();
    const same = intel();
    expect(smartTriggers.confidenceIncreased(snapshot, same)).toBe(false);
    expect(smartTriggers.fingerprintChanged(snapshot, same)).toBe(false);
    expect(smartTriggers.riskScoreIncreased(snapshot, same)).toBe(false);
    expect(smartTriggers.topWarningChanged(snapshot, same)).toBe(false);
  });

  it("confidenceIncreased/Dropped fire only past the real threshold, in the right direction", () => {
    const prev = intel({ confidenceScore: 50 });
    expect(smartTriggers.confidenceIncreased(prev, intel({ confidenceScore: 52 }))).toBe(false); // +2, below the 3-point threshold
    expect(smartTriggers.confidenceIncreased(prev, intel({ confidenceScore: 53 }))).toBe(true); // +3, at threshold
    expect(smartTriggers.confidenceDropped(prev, intel({ confidenceScore: 45 }))).toBe(true);
    expect(smartTriggers.confidenceIncreased(prev, intel({ confidenceScore: 45 }))).toBe(false);
  });

  it("fingerprintChanged fires only on a real label change", () => {
    expect(smartTriggers.fingerprintChanged(intel({ fingerprint: "Balanced" }), intel({ fingerprint: "Concentrated" }))).toBe(true);
    expect(smartTriggers.fingerprintChanged(intel({ fingerprint: "Balanced" }), intel({ fingerprint: "Balanced" }))).toBe(false);
  });

  it("primaryRecommendationChanged fires when the top recommendation id changes, including appearing/clearing", () => {
    const withRec = intel({ recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }] });
    const noRec = intel({ recommendations: [] });
    expect(smartTriggers.primaryRecommendationChanged(noRec, withRec)).toBe(true);
    expect(smartTriggers.primaryRecommendationChanged(withRec, noRec)).toBe(true);
    expect(smartTriggers.primaryRecommendationChanged(withRec, withRec)).toBe(false);
  });

  it("largestProtocolChanged fires on a real symbol change, including null transitions", () => {
    const aero = intel({ largestProtocol: { symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 1, allocationPct: 1 } });
    const comp = intel({ largestProtocol: { symbol: "COMP", name: "Compound", address: "0xcomp", usdValue: 1, allocationPct: 1 } });
    const none = intel({ largestProtocol: null });
    expect(smartTriggers.largestProtocolChanged(aero, comp)).toBe(true);
    expect(smartTriggers.largestProtocolChanged(none, aero)).toBe(true);
    expect(smartTriggers.largestProtocolChanged(aero, aero)).toBe(false);
  });

  it("topContributorChanged/topWarningChanged fire on real id changes only", () => {
    const w1 = intel({ warnings: [{ id: "concentration-high", title: "", description: "", severity: "high" }] });
    const w2 = intel({ warnings: [{ id: "no-stablecoins", title: "", description: "", severity: "moderate" }] });
    expect(smartTriggers.topWarningChanged(w1, w2)).toBe(true);
    expect(smartTriggers.topWarningChanged(w1, w1)).toBe(false);

    const c1 = intel({ negativeContributors: [{ id: "health:concentration-risk", title: "", description: "", importance: "high", reason: "" }] });
    const c2 = intel({ negativeContributors: [] });
    expect(smartTriggers.topContributorChanged(c1, c2)).toBe(true);
    expect(smartTriggers.topContributorChanged(c1, c1)).toBe(false);
  });
});

describe("summary.ts — buildHealthChangeCopy (enriched)", () => {
  it("names the real before/after scores", () => {
    const copy = buildHealthChangeCopy(intel({ healthScore: 74 }), intel({ healthScore: 82 }));
    expect(copy.title).toBe("Portfolio health improved");
    expect(copy.summary).toContain("74");
    expect(copy.summary).toContain("82");
  });

  it("names a real resolved contributor as the reason when one disappears on improvement", () => {
    const prev = intel({
      healthScore: 60,
      negativeContributors: [{ id: "health:concentration-risk", title: "Concentration Risk", description: "", importance: "high", reason: "" }],
    });
    const curr = intel({ healthScore: 80, negativeContributors: [] });
    const copy = buildHealthChangeCopy(prev, curr);
    expect(copy.summary).toMatch(/no longer flagged: concentration risk/i);
  });

  it("names a real new contributor as the reason on decline", () => {
    const prev = intel({ healthScore: 80, negativeContributors: [] });
    const curr = intel({
      healthScore: 60,
      negativeContributors: [{ id: "health:concentration-risk", title: "Concentration Risk", description: "", importance: "high", reason: "" }],
    });
    const copy = buildHealthChangeCopy(prev, curr);
    expect(copy.summary).toMatch(/new concern: concentration risk/i);
  });

  it("appends the current top recommendation as the recommended action, when one exists", () => {
    const curr = intel({
      healthScore: 82,
      recommendations: [{ id: "increase-diversification", title: "", explanation: "Continue improving diversification.", reason: "", priority: "medium" }],
    });
    const copy = buildHealthChangeCopy(intel({ healthScore: 74 }), curr);
    expect(copy.summary).toContain("Continue improving diversification.");
  });

  it("never fabricates a reason/action clause when none applies", () => {
    const copy = buildHealthChangeCopy(intel({ healthScore: 74, negativeContributors: [] }), intel({ healthScore: 82, negativeContributors: [], recommendations: [] }));
    expect(copy.summary).not.toMatch(/no longer flagged|new concern/i);
  });
});

describe("summary.ts — buildSmartContentEventCopy", () => {
  it("every kind produces real, non-empty title/summary referencing actual data", () => {
    const prev = intel({ confidenceScore: 50, fingerprint: "Balanced", riskScore: 20 });
    const curr = intel({
      confidenceScore: 80,
      fingerprint: "Concentrated",
      riskScore: 50,
      largestProtocol: { symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 1, allocationPct: 1 },
      recommendations: [{ id: "reduce-concentration", title: "Reduce concentration", explanation: "Trim your ETH position.", reason: "", priority: "high" }],
      warnings: [{ id: "concentration-high", title: "Heavy concentration", description: "ETH dominates.", severity: "high" }],
      negativeContributors: [{ id: "health:concentration-risk", title: "Concentration Risk", description: "ETH is 82%.", importance: "high", reason: "ETH is 82%." }],
    });

    for (const kind of [
      "ConfidenceIncreased",
      "ConfidenceDropped",
      "FingerprintChanged",
      "PrimaryRecommendationChanged",
      "RiskIncreased",
      "RiskDecreased",
      "LargestProtocolChanged",
      "TopContributorChanged",
      "TopWarningChanged",
    ] as const) {
      const copy = buildSmartContentEventCopy(kind, prev, curr);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.summary.length).toBeGreaterThan(0);
    }
  });

  it("FingerprintChanged cites the real fingerprintReason", () => {
    const copy = buildSmartContentEventCopy("FingerprintChanged", intel({ fingerprint: "Balanced" }), intel({ fingerprint: "Concentrated", fingerprintReason: "Your largest position is 90.0% of known value." }));
    expect(copy.summary).toContain("Your largest position is 90.0% of known value.");
  });
});

describe("events.ts — buildSmartPortfolioEvents", () => {
  it("first-ever snapshot produces no events", () => {
    expect(buildSmartPortfolioEvents(null, intel())).toEqual([]);
  });

  it("a refresh with no real change produces nothing", () => {
    const snapshot = intel();
    expect(buildSmartPortfolioEvents(snapshot, intel())).toEqual([]);
  });

  it("fires exactly the events whose predicates matched, each with structured metadata", () => {
    const prev = intel({ confidenceScore: 50 });
    const curr = intel({ confidenceScore: 90 });
    const events = buildSmartPortfolioEvents(prev, curr);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("ConfidenceIncreased");
    expect(events[0].metadata).toBeDefined();
    expect(events[0].metadata?.confidence).toBe(90);
  });

  it("every emitted kind is a real, declared WalletEventKind", () => {
    const prev = intel({ confidenceScore: 10, fingerprint: "Balanced", riskScore: 10 });
    const curr = intel({ confidenceScore: 90, fingerprint: "Concentrated", riskScore: 90 });
    const events = buildSmartPortfolioEvents(prev, curr);
    for (const event of events) {
      expect(WALLET_EVENT_KINDS).toContain(event.kind);
    }
  });

  it("original buildPortfolioContentEvents is untouched by the new kinds existing — still only produces its own 9 kinds", () => {
    const prev = intel({ overallScore: 40 });
    const curr = intel({ overallScore: 80 });
    const events = buildPortfolioContentEvents(prev, curr);
    for (const event of events) {
      expect(event.kind).not.toMatch(/Confidence|Fingerprint|PrimaryRecommendation|RiskIncreased|RiskDecreased|LargestProtocolChanged|TopContributorChanged|TopWarningChanged/);
    }
  });
});

describe("engine.ts — buildSmartWalletAutomationResults", () => {
  it("is disabled by the same global automation switch as the original results builder", () => {
    const prev = intel({ confidenceScore: 10 });
    const curr = intel({ confidenceScore: 90 });
    expect(buildSmartWalletAutomationResults(prev, curr, ENABLED_RULES, false)).toEqual([]);
  });

  it("respects each new rule's own enabled flag", () => {
    const prev = intel({ confidenceScore: 90 });
    const curr = intel({ confidenceScore: 10 }); // confidence DROPPED
    const rulesWithConfidenceDisabled = ENABLED_RULES.map((r) => (r.id === "wallet-rule:confidence" ? { ...r, enabled: false } : r));
    expect(buildSmartWalletAutomationResults(prev, curr, rulesWithConfidenceDisabled, true).some((r) => r.ruleId === "wallet-rule:confidence")).toBe(false);
    expect(buildSmartWalletAutomationResults(prev, curr, ENABLED_RULES, true).some((r) => r.ruleId === "wallet-rule:confidence")).toBe(true);
  });

  it("populates metadata with structured Phase 5 fields, reusing real data — never fabricated", () => {
    const prev = intel({ riskScore: 20 });
    const curr = intel({
      riskScore: 60,
      recommendations: [{ id: "reduce-concentration", title: "", explanation: "Trim your position.", reason: "", priority: "high" }],
    });
    const results = buildSmartWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    const riskResult = results.find((r) => r.ruleId === "wallet-rule:risk");
    expect(riskResult).toBeDefined();
    const metadata = riskResult!.metadata as Record<string, unknown>;
    expect(metadata.source).toBe("wallet-automation");
    expect(metadata.confidence).toBe(curr.confidenceScore);
    expect(metadata.estimatedImpact).toBe("high"); // from the high-priority recommendation
  });

  it("never produces a duplicate of the original health-changed result for the same underlying signal", () => {
    // A significant health change alone (no confidence/fingerprint/recommendation/risk/warning change) must
    // only ever produce the ONE original `wallet-rule:health` result — not a second "smart" one for the same fact.
    const prev = intel({ healthScore: 60, riskScore: 30, confidenceScore: 80, fingerprint: "Mixed", recommendations: [], warnings: [] });
    const curr = intel({ healthScore: 80, riskScore: 30, confidenceScore: 80, fingerprint: "Mixed", recommendations: [], warnings: [] });
    const original = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    const smart = buildSmartWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    expect(original.some((r) => r.ruleId === "wallet-rule:health")).toBe(true);
    expect(smart).toEqual([]);
  });

  it("sorted newest-first, same guarantee the original builder provides", () => {
    const prev = intel({ confidenceScore: 90, riskScore: 10 });
    const curr = intel({ confidenceScore: 10, riskScore: 90 }); // both confidence dropped and risk increased
    const results = buildSmartWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    expect(results.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].triggeredAt >= results[i].triggeredAt).toBe(true);
    }
  });
});

describe("snapshot.ts — buildAutomationSnapshot / buildAutomationDiff / buildAutomationMetadata", () => {
  it("snapshot fields are direct reads of PortfolioIntelligence, never recalculated", () => {
    const intelligence = intel({ overallScore: 77, fingerprint: "Growth", confidenceScore: 65 });
    const snapshot = buildAutomationSnapshot(intelligence);
    expect(snapshot.overallScore).toBe(77);
    expect(snapshot.fingerprint).toBe("Growth");
    expect(snapshot.confidenceScore).toBe(65);
    expect(snapshot.timestamp).toBe(intelligence.lastUpdated);
  });

  it("V4-ANALYTICS-001C: every real snapshot is stamped with the current analyticsVersion, and it never counts as a 'changed' diff field", () => {
    const prev = buildAutomationSnapshot(intel({ overallScore: 50 }));
    const curr = buildAutomationSnapshot(intel({ overallScore: 80 }));
    expect(prev.analyticsVersion).toBe(1);
    expect(curr.analyticsVersion).toBe(1);
    expect(buildAutomationDiff(prev, curr).changed).not.toContain("analyticsVersion");
  });

  it("diff names exactly which fields changed, nothing more", () => {
    const prev = buildAutomationSnapshot(intel({ overallScore: 50, fingerprint: "Balanced" }));
    const curr = buildAutomationSnapshot(intel({ overallScore: 80, fingerprint: "Balanced" }));
    const diff = buildAutomationDiff(prev, curr);
    expect(diff.changed).toContain("overallScore");
    expect(diff.changed).not.toContain("fingerprint");
  });

  it("diff against a null previous reports no changes — nothing to have transitioned from", () => {
    const curr = buildAutomationSnapshot(intel());
    expect(buildAutomationDiff(null, curr).changed).toEqual([]);
  });

  it("metadata counts real inputs, never fabricates activity", () => {
    const metadata = buildAutomationMetadata(ENABLED_RULES, [], [], "2026-09-04T00:00:00.000Z");
    expect(metadata.ruleCount).toBe(ENABLED_RULES.length);
    expect(metadata.enabledRuleCount).toBe(ENABLED_RULES.filter((r) => r.enabled).length);
    expect(metadata.triggeredResultCount).toBe(0);
    expect(metadata.eventCount).toBe(0);
  });

  it("is fully deterministic", () => {
    const intelligence = intel();
    expect(buildAutomationSnapshot(intelligence)).toEqual(buildAutomationSnapshot(intelligence));
  });
});
