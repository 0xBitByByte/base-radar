import { describe, expect, it } from "vitest";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { buildLifecycleEvents, buildPortfolioContentEvents } from "@/lib/wallet-automation/events";
import { buildWalletAutomationResults } from "@/lib/wallet-automation/engine";
import { DEFAULT_WALLET_AUTOMATION_RULES } from "@/lib/wallet-automation/rules";
import type { WalletLifecycleState } from "@/lib/wallet-automation/types";

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

describe("Wallet events (tier 1) — buildPortfolioContentEvents", () => {
  it("first-ever snapshot (previous: null) produces no events — nothing has 'changed' yet", () => {
    expect(buildPortfolioContentEvents(null, intel())).toEqual([]);
  });

  it("refresh with an identical snapshot produces no new events", () => {
    const snapshot = intel();
    expect(buildPortfolioContentEvents(snapshot, { ...snapshot })).toEqual([]);
  });

  it("ConcentrationThresholdExceeded fires only on the transition into High, not while already High", () => {
    const moderate = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } });
    const high = intel({ concentrationRisk: { level: "high", topHoldingPct: 80, description: "" }, largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 8000, allocationPct: 80 } });

    const firstTransition = buildPortfolioContentEvents(moderate, high);
    expect(firstTransition.some((e) => e.kind === "ConcentrationThresholdExceeded")).toBe(true);

    const stillHigh = buildPortfolioContentEvents(high, high);
    expect(stillHigh.some((e) => e.kind === "ConcentrationThresholdExceeded")).toBe(false);
  });

  it("RiskLevelChanged fires on any level transition, including a downgrade", () => {
    const high = intel({ concentrationRisk: { level: "high", topHoldingPct: 80, description: "" } });
    const moderate = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } });
    const events = buildPortfolioContentEvents(high, moderate);
    expect(events.some((e) => e.kind === "RiskLevelChanged")).toBe(true);
  });

  it("StablecoinExposureDropped / Recovered fire only on genuine 0<->positive transitions", () => {
    const withStables = intel({ stablecoinExposure: 15 });
    const noStables = intel({ stablecoinExposure: 0 });

    expect(buildPortfolioContentEvents(withStables, noStables).some((e) => e.kind === "StablecoinExposureDropped")).toBe(true);
    expect(buildPortfolioContentEvents(noStables, noStables).some((e) => e.kind === "StablecoinExposureDropped")).toBe(false);
    expect(buildPortfolioContentEvents(noStables, withStables).some((e) => e.kind === "StablecoinExposureRecovered")).toBe(true);
  });

  it("PricingCoverageDropped fires when coverage crosses below 80%, not above it", () => {
    const good = intel({ pricingCoverage: 90 });
    const poor = intel({ pricingCoverage: 60 });
    expect(buildPortfolioContentEvents(good, poor).some((e) => e.kind === "PricingCoverageDropped")).toBe(true);
    expect(buildPortfolioContentEvents(poor, intel({ pricingCoverage: 70 })).some((e) => e.kind === "PricingCoverageDropped")).toBe(false);
  });

  it("UnknownAssetsDetected fires when the unknown count increases", () => {
    const clean = intel({ unknownAssetCount: 0 });
    const withUnknown = intel({ unknownAssetCount: 1 });
    expect(buildPortfolioContentEvents(clean, withUnknown).some((e) => e.kind === "UnknownAssetsDetected")).toBe(true);
    expect(buildPortfolioContentEvents(withUnknown, withUnknown).some((e) => e.kind === "UnknownAssetsDetected")).toBe(false);
  });

  it("LargestHoldingChanged fires when the top holding's symbol changes", () => {
    const ethTop = intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } });
    const usdcTop = intel({ largestHolding: { symbol: "USDC", name: "USDC", address: "0xusdc", usdValue: 6000, allocationPct: 60 } });
    expect(buildPortfolioContentEvents(ethTop, usdcTop).some((e) => e.kind === "LargestHoldingChanged")).toBe(true);
    expect(buildPortfolioContentEvents(ethTop, ethTop).some((e) => e.kind === "LargestHoldingChanged")).toBe(false);
  });

  it("PortfolioValueChanged fires only on a >=5% relative move, not a tiny wobble", () => {
    const base = intel({ totalUsdValue: 10000 });
    const tinyMove = intel({ totalUsdValue: 10050 }); // 0.5%
    const bigMove = intel({ totalUsdValue: 11000 }); // 10%
    expect(buildPortfolioContentEvents(base, tinyMove).some((e) => e.kind === "PortfolioValueChanged")).toBe(false);
    expect(buildPortfolioContentEvents(base, bigMove).some((e) => e.kind === "PortfolioValueChanged")).toBe(true);
  });

  it("is deterministic — identical inputs always produce identical output", () => {
    const prev = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } });
    const curr = intel({ concentrationRisk: { level: "high", topHoldingPct: 80, description: "" } });
    expect(buildPortfolioContentEvents(prev, curr)).toEqual(buildPortfolioContentEvents(prev, curr));
  });
});

describe("Wallet lifecycle events", () => {
  const base: WalletLifecycleState = { isConnected: false, isSupportedNetwork: true, chainSupported: true, lastUpdated: null };

  it("no previous state (first render) produces no lifecycle events", () => {
    expect(buildLifecycleEvents(null, base, "t")).toEqual([]);
  });

  it("WalletConnected fires on disconnected -> connected", () => {
    const connected = { ...base, isConnected: true, lastUpdated: "t1" };
    expect(buildLifecycleEvents(base, connected, "t").some((e) => e.kind === "WalletConnected")).toBe(true);
  });

  it("WalletDisconnected fires on connected -> disconnected", () => {
    const connected = { ...base, isConnected: true, lastUpdated: "t1" };
    expect(buildLifecycleEvents(connected, base, "t").some((e) => e.kind === "WalletDisconnected")).toBe(true);
  });

  it("UnsupportedNetwork fires only when connected and network support is lost", () => {
    const connectedSupported = { ...base, isConnected: true, isSupportedNetwork: true, lastUpdated: "t1" };
    const connectedUnsupported = { ...connectedSupported, isSupportedNetwork: false };
    expect(buildLifecycleEvents(connectedSupported, connectedUnsupported, "t").some((e) => e.kind === "UnsupportedNetwork")).toBe(true);
    expect(buildLifecycleEvents(base, { ...base, isSupportedNetwork: false }, "t").some((e) => e.kind === "UnsupportedNetwork")).toBe(false);
  });

  it("RefreshCompleted fires when lastUpdated changes while connected", () => {
    const first = { ...base, isConnected: true, lastUpdated: "t1" };
    const second = { ...first, lastUpdated: "t2" };
    expect(buildLifecycleEvents(first, second, "t").some((e) => e.kind === "RefreshCompleted")).toBe(true);
    expect(buildLifecycleEvents(first, first, "t").some((e) => e.kind === "RefreshCompleted")).toBe(false);
  });
});

describe("Automation rules (tier 2) — buildWalletAutomationResults", () => {
  it("automation disabled globally produces zero results even with real triggers", () => {
    const prev = intel({ stablecoinExposure: 10 });
    const curr = intel({ stablecoinExposure: 0 });
    expect(buildWalletAutomationResults(prev, curr, ENABLED_RULES, false)).toEqual([]);
  });

  it("a disabled individual rule never fires even when its condition is true", () => {
    const disabledConcentration = ENABLED_RULES.map((r) => (r.id === "wallet-rule:concentration" ? { ...r, enabled: false } : r));
    const prev = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } });
    const curr = intel({ concentrationRisk: { level: "high", topHoldingPct: 80, description: "" } });
    const results = buildWalletAutomationResults(prev, curr, disabledConcentration, true);
    expect(results.some((r) => r.ruleId === "wallet-rule:concentration")).toBe(false);
  });

  it("refresh without changes produces no new results", () => {
    const snapshot = intel();
    expect(buildWalletAutomationResults(snapshot, { ...snapshot }, ENABLED_RULES, true)).toEqual([]);
  });

  it("first-ever snapshot produces no results — nothing to have transitioned from", () => {
    expect(buildWalletAutomationResults(null, intel(), ENABLED_RULES, true)).toEqual([]);
  });

  it("High Concentration rule produces a real AutomationResult referencing the real symbol/percentage", () => {
    const prev = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } });
    const curr = intel({
      concentrationRisk: { level: "high", topHoldingPct: 82, description: "" },
      largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 8200, allocationPct: 82 },
    });
    const results = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    const match = results.find((r) => r.ruleId === "wallet-rule:concentration");
    expect(match).toBeDefined();
    expect(match?.summary).toContain("ETH");
    expect(match?.summary).toContain("82");
    expect(match?.status).toBe("triggered");
    expect(match?.triggeredAt).toBe(curr.lastUpdated);
  });

  it("Portfolio Health rule fires on a significant healthScore change and labels improved vs declined correctly", () => {
    const prev = intel({ healthScore: 50 });
    const improved = intel({ healthScore: 70 });
    const declined = intel({ healthScore: 30 });

    const improvedResult = buildWalletAutomationResults(prev, improved, ENABLED_RULES, true).find((r) => r.ruleId === "wallet-rule:health");
    const declinedResult = buildWalletAutomationResults(prev, declined, ENABLED_RULES, true).find((r) => r.ruleId === "wallet-rule:health");
    expect(improvedResult?.title).toBe("Portfolio health improved");
    expect(declinedResult?.title).toBe("Portfolio health declined");
  });

  it("multiple simultaneous triggers all produce distinct results in one call — no duplicate suppression across different rules", () => {
    const prev = intel({ stablecoinExposure: 10, unknownAssetCount: 0 });
    const curr = intel({ stablecoinExposure: 0, unknownAssetCount: 2 });
    const results = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    expect(results.some((r) => r.ruleId === "wallet-rule:stablecoin")).toBe(true);
    expect(results.some((r) => r.ruleId === "wallet-rule:unknown-assets")).toBe(true);
  });

  it("is deterministic — identical inputs always produce byte-identical output", () => {
    const prev = intel({ stablecoinExposure: 10 });
    const curr = intel({ stablecoinExposure: 0 });
    const first = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    const second = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    expect(second).toEqual(first);
  });

  it("populates metadata.trigger/metadata.actions matching the rule — the exact shape components/automation/filters.ts's getResultTrigger/getResultActions read, so a blended Dashboard widget renders wallet results identically to watchlist ones", () => {
    const prev = intel({ stablecoinExposure: 10 });
    const curr = intel({ stablecoinExposure: 0 });
    const [result] = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    const rule = ENABLED_RULES.find((r) => r.id === "wallet-rule:stablecoin")!;
    expect(result.metadata.trigger).toBe(rule.trigger);
    expect(result.metadata.actions).toEqual(rule.actions);
  });

  it("results are sorted newest-triggeredAt-first, matching buildAutomationRuleStats' precondition", () => {
    const prev = intel({ stablecoinExposure: 10, unknownAssetCount: 0, lastUpdated: "2026-09-04T00:00:00.000Z" });
    const curr = intel({ stablecoinExposure: 0, unknownAssetCount: 2, lastUpdated: "2026-09-04T01:00:00.000Z" });
    const results = buildWalletAutomationResults(prev, curr, ENABLED_RULES, true);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].triggeredAt.localeCompare(results[i - 1].triggeredAt)).toBeLessThanOrEqual(0);
    }
  });
});
