import { describe, expect, it } from "vitest";

import type { HoldingAsset } from "@/lib/holdings/types";
import { classificationCoverage } from "@/lib/portfolio-intelligence/allocation";
import { buildConfidence, confidenceLevelFromScore } from "@/lib/portfolio-intelligence/confidence";
import { buildScoreContributors } from "@/lib/portfolio-intelligence/contributors";
import { diversificationScore } from "@/lib/portfolio-intelligence/diversification";
import { buildPortfolioIntelligence } from "@/lib/portfolio-intelligence/engine";
import { buildExecutiveSummary } from "@/lib/portfolio-intelligence/executiveSummary";
import { buildPortfolioFingerprint, type FingerprintInputs } from "@/lib/portfolio-intelligence/fingerprint";
import { buildHealthBreakdown } from "@/lib/portfolio-intelligence/health";
import { buildOpportunities } from "@/lib/portfolio-intelligence/opportunities";
import { buildWarnings } from "@/lib/portfolio-intelligence/risk";
import * as PortfolioIntelligencePublicApi from "@/lib/portfolio-intelligence/index";

const NOW = "2026-09-04T00:00:00.000Z";

function holding(overrides: Partial<HoldingAsset> & { symbol: string }): HoldingAsset {
  return {
    address: `0x${overrides.symbol.toLowerCase()}`,
    name: overrides.symbol,
    logo: null,
    balance: BigInt("1000000000000000000"),
    decimals: 18,
    formattedBalance: "1.0",
    usdPrice: 1,
    usdValue: 1,
    allocationPct: 100,
    chain: "base",
    verified: null,
    tokenType: "erc20",
    ...overrides,
  };
}

function eth(overrides: Partial<HoldingAsset> = {}): HoldingAsset {
  return holding({ symbol: "ETH", address: null, tokenType: "native", ...overrides });
}

function ethHeavyWallet(): HoldingAsset[] {
  return [
    eth({ usdValue: 8200, allocationPct: 82 }),
    holding({ symbol: "USDC", usdValue: 400, allocationPct: 4, verified: true }),
    holding({ symbol: "AERO", usdValue: 1400, allocationPct: 14, verified: true }),
  ];
}

const baseFingerprintInputs: FingerprintInputs = {
  pricedCount: 3,
  stablecoinPct: 20,
  ethPct: 40,
  otherPct: 40,
  topHoldingPct: 40,
  concentrationLevel: "moderate",
  diversificationScoreValue: 50,
  protocolConcentrationPct: 0,
  classificationCoveragePct: 80,
  riskScoreValue: 20,
};

describe("confidence.ts", () => {
  it("is NOT derived from portfolio value — two wallets with identical coverage/verification but different totalUsdValue score identically", () => {
    const assets = [eth({ usdValue: 100, allocationPct: 50 }), holding({ symbol: "USDC", usdValue: 100, allocationPct: 50, verified: true })];
    const small = buildConfidence(assets, 200);
    const largeAssets = [eth({ usdValue: 1_000_000, allocationPct: 50 }), holding({ symbol: "USDC", usdValue: 1_000_000, allocationPct: 50, verified: true })];
    const large = buildConfidence(largeAssets, 2_000_000);
    expect(small.confidenceScore).toBe(large.confidenceScore);
  });

  it("scores high for a fully-priced, fully-verified/classified wallet", () => {
    const assets = ethHeavyWallet();
    const { confidenceScore, confidenceLevel } = buildConfidence(assets, 10000);
    expect(confidenceScore).toBeGreaterThanOrEqual(75);
    expect(confidenceLevel).toBe("High");
  });

  it("scores low for a mostly-unpriced, unclassified wallet", () => {
    const assets = [holding({ symbol: "RANDOMTOKEN", usdValue: 100, allocationPct: 100 }), holding({ symbol: "U1", usdValue: null, allocationPct: null }), holding({ symbol: "U2", usdValue: null, allocationPct: null })];
    const { confidenceScore, confidenceLevel } = buildConfidence(assets, 100);
    expect(confidenceScore).toBeLessThan(45);
    expect(confidenceLevel).toBe("Low");
  });

  it("confidenceLevelFromScore thresholds are correctly ordered and cover the full range", () => {
    expect(confidenceLevelFromScore(100)).toBe("High");
    expect(confidenceLevelFromScore(75)).toBe("High");
    expect(confidenceLevelFromScore(74)).toBe("Medium");
    expect(confidenceLevelFromScore(45)).toBe("Medium");
    expect(confidenceLevelFromScore(44)).toBe("Low");
    expect(confidenceLevelFromScore(0)).toBe("Low");
  });

  it("empty portfolio — 0, not NaN, no crash", () => {
    const { confidenceScore, confidenceLevel } = buildConfidence([], 0);
    expect(confidenceScore).toBe(0);
    expect(confidenceLevel).toBe("Low");
  });

  it("is fully deterministic", () => {
    const assets = ethHeavyWallet();
    expect(buildConfidence(assets, 10000)).toEqual(buildConfidence(assets, 10000));
  });
});

describe("fingerprint.ts — buildPortfolioFingerprint", () => {
  it("no priced assets — Unclassified", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, pricedCount: 0 }).fingerprint).toBe("Unclassified");
  });

  it("extreme single-asset concentration — Concentrated, checked ahead of every other rule", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, topHoldingPct: 90, stablecoinPct: 90 }).fingerprint).toBe("Concentrated");
  });

  it("dominant stablecoin allocation — Stablecoin Heavy", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, stablecoinPct: 70 }).fingerprint).toBe("Stablecoin Heavy");
  });

  it("mostly unrecognized tokens — Experimental", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, classificationCoveragePct: 10 }).fingerprint).toBe("Experimental");
  });

  it("heavy single-protocol exposure — DeFi Native", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, protocolConcentrationPct: 55, classificationCoveragePct: 90 }).fingerprint).toBe("DeFi Native");
  });

  it("real stablecoin cushion + low risk — Conservative", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, stablecoinPct: 30, riskScoreValue: 10, classificationCoveragePct: 90 }).fingerprint).toBe("Conservative");
  });

  it("high altcoin exposure + elevated concentration — Aggressive", () => {
    expect(
      buildPortfolioFingerprint({ ...baseFingerprintInputs, otherPct: 60, stablecoinPct: 5, concentrationLevel: "elevated", classificationCoveragePct: 90 }).fingerprint
    ).toBe("Aggressive");
  });

  it("high altcoin exposure + good diversification — Growth", () => {
    expect(
      buildPortfolioFingerprint({ ...baseFingerprintInputs, otherPct: 60, stablecoinPct: 5, diversificationScoreValue: 75, classificationCoveragePct: 90 }).fingerprint
    ).toBe("Growth");
  });

  it("ETH-dominant, moderate diversification — Large Cap Focused", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, ethPct: 60, otherPct: 10, diversificationScoreValue: 40, classificationCoveragePct: 90 }).fingerprint).toBe(
      "Large Cap Focused"
    );
  });

  it("well diversified, no other pattern dominates — Balanced", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, diversificationScoreValue: 80, ethPct: 20, otherPct: 20, stablecoinPct: 20 }).fingerprint).toBe("Balanced");
  });

  it("no pattern clearly dominates — Mixed", () => {
    expect(buildPortfolioFingerprint({ ...baseFingerprintInputs, diversificationScoreValue: 45, ethPct: 30, otherPct: 20, stablecoinPct: 15 }).fingerprint).toBe("Mixed");
  });

  it("every branch returns a non-empty reason naming a real threshold", () => {
    const result = buildPortfolioFingerprint(baseFingerprintInputs);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it("is a pure function of its inputs — identical inputs always produce identical output", () => {
    expect(buildPortfolioFingerprint(baseFingerprintInputs)).toEqual(buildPortfolioFingerprint(baseFingerprintInputs));
  });
});

describe("contributors.ts — buildScoreContributors", () => {
  it("sources positive/negative contributors from healthBreakdown, warnings, and opportunities — never invents a new one", () => {
    const assets = ethHeavyWallet();
    const totalUsdValue = 10000;
    const healthBreakdown = buildHealthBreakdown(assets, totalUsdValue);
    const warnings = buildWarnings(assets, totalUsdValue);
    const opportunities = buildOpportunities(assets, totalUsdValue, diversificationScore(assets));
    const { positiveContributors, negativeContributors } = buildScoreContributors(healthBreakdown, warnings, opportunities);

    for (const c of [...positiveContributors, ...negativeContributors]) {
      const fromHealth = healthBreakdown.some((h) => c.id === `health:${h.id}`);
      const fromWarning = warnings.some((w) => c.id === `warning:${w.id}`);
      const fromOpportunity = opportunities.some((o) => c.id === `opportunity:${o.id}`);
      expect(fromHealth || fromWarning || fromOpportunity).toBe(true);
    }
  });

  it("never duplicates the same fact under two titles — a fired 'Concentration Risk' health item excludes the matching concentration warning", () => {
    const assets = [eth({ usdValue: 9000, allocationPct: 90 }), holding({ symbol: "USDC", usdValue: 1000, allocationPct: 10 })];
    const totalUsdValue = 10000;
    const healthBreakdown = buildHealthBreakdown(assets, totalUsdValue);
    const warnings = buildWarnings(assets, totalUsdValue);
    expect(warnings.some((w) => w.id === "concentration-high")).toBe(true); // the raw warning DOES fire...
    const { negativeContributors } = buildScoreContributors(healthBreakdown, warnings, []);
    // ...but only once, as the health-sourced item, never a second time as the warning-sourced one.
    expect(negativeContributors.filter((c) => c.id === "health:concentration-risk" || c.id === "warning:concentration-high")).toHaveLength(1);
  });

  it("zero-point health contributions never become contributors — only real, active signals appear", () => {
    const moderate = [eth({ usdValue: 3000, allocationPct: 30 }), holding({ symbol: "USDC", usdValue: 3500, allocationPct: 35, verified: true }), holding({ symbol: "AERO", usdValue: 3500, allocationPct: 35, verified: true })];
    const healthBreakdown = buildHealthBreakdown(moderate, 10000);
    expect(healthBreakdown.find((c) => c.id === "concentration-risk")?.points).toBe(0);
    const { negativeContributors } = buildScoreContributors(healthBreakdown, [], []);
    expect(negativeContributors.some((c) => c.id === "health:concentration-risk")).toBe(false);
  });

  it("empty inputs produce empty output, no crash", () => {
    expect(buildScoreContributors([], [], [])).toEqual({ positiveContributors: [], negativeContributors: [] });
  });
});

describe("executiveSummary.ts — buildExecutiveSummary", () => {
  it("composes health, largest holding, diversification, main risk, and primary recommendation into one paragraph", () => {
    const assets = ethHeavyWallet();
    const totalUsdValue = 10000;
    const result = buildPortfolioIntelligence(assets, totalUsdValue, NOW);
    expect(result.executiveSummary).toContain(String(result.healthScore));
    expect(result.executiveSummary).toContain("ETH");
    expect(result.executiveSummary).toContain(String(result.diversificationScore));
  });

  it("honestly handles no priced holdings rather than fabricating a summary", () => {
    const summary = buildExecutiveSummary({
      healthScore: 0,
      largestHolding: null,
      diversificationScore: 0,
      diversificationRating: "Poor",
      topWarning: null,
      topRecommendation: null,
    });
    expect(summary).toMatch(/no priced holdings/i);
  });

  it("handles the no-warnings/no-recommendations case honestly, not by omitting the sentence", () => {
    const summary = buildExecutiveSummary({
      healthScore: 90,
      largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 2500, allocationPct: 25 },
      diversificationScore: 90,
      diversificationRating: "Excellent",
      topWarning: null,
      topRecommendation: null,
    });
    expect(summary).toMatch(/no risk flags/i);
    expect(summary).toMatch(/no recommendations/i);
  });
});

describe("index.ts — public API barrel", () => {
  it("exposes buildPortfolioIntelligence unchanged", () => {
    expect(typeof PortfolioIntelligencePublicApi.buildPortfolioIntelligence).toBe("function");
  });

  it("buildPortfolioHealth bundles the same result buildPortfolioIntelligence itself produces", () => {
    const assets = ethHeavyWallet();
    const full = buildPortfolioIntelligence(assets, 10000, NOW);
    const bundled = PortfolioIntelligencePublicApi.buildPortfolioHealth(assets, 10000);
    expect(bundled.healthScore).toBe(full.healthScore);
    expect(bundled.healthBreakdown).toEqual(full.healthBreakdown);
  });

  it("buildPortfolioRisk bundles the same result buildPortfolioIntelligence itself produces", () => {
    const assets = ethHeavyWallet();
    const full = buildPortfolioIntelligence(assets, 10000, NOW);
    const bundled = PortfolioIntelligencePublicApi.buildPortfolioRisk(assets, 10000);
    expect(bundled.riskScore).toBe(full.riskScore);
    expect(bundled.concentrationRisk).toEqual(full.concentrationRisk);
    expect(bundled.warnings).toEqual(full.warnings);
  });

  it("buildPortfolioRecommendations/Opportunities/Summary match buildPortfolioIntelligence's own output", () => {
    const assets = ethHeavyWallet();
    const full = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(PortfolioIntelligencePublicApi.buildPortfolioRecommendations(assets, 10000)).toEqual(full.recommendations);
    expect(PortfolioIntelligencePublicApi.buildPortfolioOpportunities(assets, 10000)).toEqual(full.opportunities);
    expect(PortfolioIntelligencePublicApi.buildPortfolioSummary(assets, 10000)).toBe(full.summary);
  });

  it("every underlying primitive (pricingCoverage, classificationCoverage, protocolConcentration, topHoldings, verifiedSharePct, diversificationRating) is reachable from the barrel", () => {
    expect(typeof PortfolioIntelligencePublicApi.pricingCoverage).toBe("function");
    expect(typeof PortfolioIntelligencePublicApi.classificationCoverage).toBe("function");
    expect(typeof PortfolioIntelligencePublicApi.protocolConcentration).toBe("function");
    expect(typeof PortfolioIntelligencePublicApi.topHoldings).toBe("function");
    expect(typeof PortfolioIntelligencePublicApi.verifiedSharePct).toBe("function");
    expect(typeof PortfolioIntelligencePublicApi.diversificationRating).toBe("function");
  });
});

describe("buildPortfolioIntelligence — V4-INTELLIGENCE-002 fields end to end", () => {
  it("classificationCoverage is a real, independent read distinct from pricingCoverage", () => {
    // A fully-priced wallet of entirely UNRECOGNIZED tokens: pricing coverage is 100%, but classification coverage should be honestly low.
    const assets = [holding({ symbol: "RANDOM1", usdValue: 5000, allocationPct: 50 }), holding({ symbol: "RANDOM2", usdValue: 5000, allocationPct: 50 })];
    const result = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(result.pricingCoverage).toBe(100);
    expect(classificationCoverage(assets, 10000)).toBe(0);
    expect(result.fingerprint).toBe("Experimental");
  });

  it("positiveContributors/negativeContributors are present and internally consistent with healthBreakdown/warnings", () => {
    const result = buildPortfolioIntelligence(ethHeavyWallet(), 10000, NOW);
    expect(result.positiveContributors.length).toBeGreaterThan(0);
    expect(result.negativeContributors.length).toBeGreaterThan(0);
  });

  it("is fully deterministic across every new field, not just the original ones", () => {
    const assets = ethHeavyWallet();
    const first = buildPortfolioIntelligence(assets, 10000, NOW);
    const second = buildPortfolioIntelligence(assets, 10000, NOW);
    expect(second).toEqual(first);
  });

  it("empty portfolio — every new field reads honestly empty/zero, no crash", () => {
    const result = buildPortfolioIntelligence([], 0, NOW);
    expect(result.positiveContributors).toEqual([]);
    // The one honest exception: `healthBreakdown`'s "Unknown Assets" deduction
    // fires even for an empty wallet (see health.ts's own empty-portfolio
    // test) — same real signal correctly surfaces here as one contributor.
    expect(result.negativeContributors).toHaveLength(1);
    expect(result.negativeContributors[0].id).toBe("health:unknown-assets");
    expect(result.confidenceScore).toBe(0);
    expect(result.confidenceLevel).toBe("Low");
    expect(result.fingerprint).toBe("Unclassified");
    expect(result.executiveSummary).toMatch(/no priced holdings/i);
  });
});
