import { describe, expect, it } from "vitest";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import {
  PRICING_COVERAGE_THRESHOLD,
  SCORE_CHANGE_THRESHOLD,
  VALUE_CHANGE_RATIO_THRESHOLD,
  concentrationJustExceededHigh,
  healthChangedSignificantly,
  largestHoldingChanged,
  pricingCoverageJustDropped,
  pricingCoverageJustRecovered,
  portfolioValueChangedSignificantly,
  riskLevelChanged,
  scoreChangedSignificantly,
  stablecoinExposureJustDropped,
  stablecoinExposureJustRecovered,
  unknownAssetsIncreased,
} from "@/lib/wallet-automation/triggers";

// Same fixture-builder convention already established in
// tests/lib/wallet-automation/engine.test.ts and smart.test.ts.
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

describe("exported thresholds", () => {
  it("match the documented real values", () => {
    expect(PRICING_COVERAGE_THRESHOLD).toBe(80);
    expect(SCORE_CHANGE_THRESHOLD).toBe(3);
    expect(VALUE_CHANGE_RATIO_THRESHOLD).toBe(0.05);
  });
});

describe("concentrationJustExceededHigh", () => {
  it("previous:null never fires — nothing to have transitioned from", () => {
    expect(concentrationJustExceededHigh(null, intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } }))).toBe(false);
  });

  it("fires on a genuine moderate→high transition", () => {
    const prev = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" } });
    const curr = intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } });
    expect(concentrationJustExceededHigh(prev, curr)).toBe(true);
  });

  it("is edge-triggered — already high, still high, fires nothing", () => {
    const level = { level: "high" as const, topHoldingPct: 90, description: "" };
    expect(concentrationJustExceededHigh(intel({ concentrationRisk: level }), intel({ concentrationRisk: level }))).toBe(false);
  });

  it("never fires on a high→moderate improvement (that is a decrease, not an increase-past-high)", () => {
    const prev = intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } });
    const curr = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" } });
    expect(concentrationJustExceededHigh(prev, curr)).toBe(false);
  });

  it("never fires when the new level still isn't high (moderate→elevated)", () => {
    const prev = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" } });
    const curr = intel({ concentrationRisk: { level: "elevated", topHoldingPct: 70, description: "" } });
    expect(concentrationJustExceededHigh(prev, curr)).toBe(false);
  });
});

describe("riskLevelChanged", () => {
  it("previous:null never fires", () => {
    expect(riskLevelChanged(null, intel())).toBe(false);
  });

  it("fires on any real level change, in either direction", () => {
    const moderate = intel({ concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" } });
    const high = intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } });
    expect(riskLevelChanged(moderate, high)).toBe(true);
    expect(riskLevelChanged(high, moderate)).toBe(true);
  });

  it("a refresh with the identical level fires nothing", () => {
    const level = { level: "elevated" as const, topHoldingPct: 65, description: "" };
    expect(riskLevelChanged(intel({ concentrationRisk: level }), intel({ concentrationRisk: level }))).toBe(false);
  });
});

describe("scoreChangedSignificantly (overallScore)", () => {
  it("previous:null never fires", () => {
    expect(scoreChangedSignificantly(null, intel({ overallScore: 80 }))).toBe(false);
  });

  it("below the real threshold (a 2-point wobble) fires nothing", () => {
    expect(scoreChangedSignificantly(intel({ overallScore: 60 }), intel({ overallScore: 62 }))).toBe(false);
  });

  it("fires exactly at the real threshold boundary (3 points)", () => {
    expect(scoreChangedSignificantly(intel({ overallScore: 60 }), intel({ overallScore: 63 }))).toBe(true);
  });

  it("fires on a real decrease past the threshold too (absolute-value comparison)", () => {
    expect(scoreChangedSignificantly(intel({ overallScore: 60 }), intel({ overallScore: 57 }))).toBe(true);
  });

  it("no change at all fires nothing", () => {
    expect(scoreChangedSignificantly(intel({ overallScore: 60 }), intel({ overallScore: 60 }))).toBe(false);
  });
});

describe("healthChangedSignificantly (healthScore) — same threshold discipline as scoreChangedSignificantly, independently", () => {
  it("previous:null never fires", () => {
    expect(healthChangedSignificantly(null, intel({ healthScore: 80 }))).toBe(false);
  });

  it("below threshold fires nothing; at the boundary and beyond fires", () => {
    expect(healthChangedSignificantly(intel({ healthScore: 65 }), intel({ healthScore: 67 }))).toBe(false);
    expect(healthChangedSignificantly(intel({ healthScore: 65 }), intel({ healthScore: 68 }))).toBe(true);
  });

  it("a change in overallScore alone never fires this — the two score predicates are independent", () => {
    expect(healthChangedSignificantly(intel({ overallScore: 60, healthScore: 65 }), intel({ overallScore: 90, healthScore: 65 }))).toBe(false);
  });
});

describe("stablecoinExposureJustDropped / stablecoinExposureJustRecovered", () => {
  it("previous:null never fires either direction", () => {
    expect(stablecoinExposureJustDropped(null, intel({ stablecoinExposure: 0 }))).toBe(false);
    expect(stablecoinExposureJustRecovered(null, intel({ stablecoinExposure: 20 }))).toBe(false);
  });

  it("dropped fires only on a genuine >0 → 0 transition", () => {
    expect(stablecoinExposureJustDropped(intel({ stablecoinExposure: 20 }), intel({ stablecoinExposure: 0 }))).toBe(true);
    expect(stablecoinExposureJustDropped(intel({ stablecoinExposure: 0 }), intel({ stablecoinExposure: 0 }))).toBe(false); // already zero — level-triggered avoided
    expect(stablecoinExposureJustDropped(intel({ stablecoinExposure: 20 }), intel({ stablecoinExposure: 10 }))).toBe(false); // still nonzero
  });

  it("recovered fires only on the exact inverse transition (0 → >0)", () => {
    expect(stablecoinExposureJustRecovered(intel({ stablecoinExposure: 0 }), intel({ stablecoinExposure: 15 }))).toBe(true);
    expect(stablecoinExposureJustRecovered(intel({ stablecoinExposure: 15 }), intel({ stablecoinExposure: 15 }))).toBe(false);
    expect(stablecoinExposureJustRecovered(intel({ stablecoinExposure: 20 }), intel({ stablecoinExposure: 0 }))).toBe(false); // that's a drop, not a recovery
  });

  it("dropped and recovered are mutually exclusive for the same real transition", () => {
    const prev = intel({ stablecoinExposure: 20 });
    const curr = intel({ stablecoinExposure: 0 });
    expect(stablecoinExposureJustDropped(prev, curr)).toBe(true);
    expect(stablecoinExposureJustRecovered(prev, curr)).toBe(false);
  });
});

describe("pricingCoverageJustDropped / pricingCoverageJustRecovered", () => {
  it("previous:null never fires either direction", () => {
    expect(pricingCoverageJustDropped(null, intel({ pricingCoverage: 50 }))).toBe(false);
    expect(pricingCoverageJustRecovered(null, intel({ pricingCoverage: 100 }))).toBe(false);
  });

  it("dropped fires exactly at the real 80% boundary crossing", () => {
    expect(pricingCoverageJustDropped(intel({ pricingCoverage: 80 }), intel({ pricingCoverage: 79 }))).toBe(true);
    expect(pricingCoverageJustDropped(intel({ pricingCoverage: 100 }), intel({ pricingCoverage: 80 }))).toBe(false); // 80 is still "covered" (inclusive)
  });

  it("dropped is edge-triggered — already below 80, still below, fires nothing", () => {
    expect(pricingCoverageJustDropped(intel({ pricingCoverage: 70 }), intel({ pricingCoverage: 50 }))).toBe(false);
  });

  it("recovered fires exactly at the real 80% boundary crossing, the inverse direction", () => {
    expect(pricingCoverageJustRecovered(intel({ pricingCoverage: 79 }), intel({ pricingCoverage: 80 }))).toBe(true);
    expect(pricingCoverageJustRecovered(intel({ pricingCoverage: 50 }), intel({ pricingCoverage: 79 }))).toBe(false); // still below the line
  });

  it("recovered is edge-triggered — already covered, still covered, fires nothing", () => {
    expect(pricingCoverageJustRecovered(intel({ pricingCoverage: 90 }), intel({ pricingCoverage: 100 }))).toBe(false);
  });
});

describe("unknownAssetsIncreased", () => {
  it("previous:null never fires", () => {
    expect(unknownAssetsIncreased(null, intel({ unknownAssetCount: 3 }))).toBe(false);
  });

  it("fires only on a genuine increase", () => {
    expect(unknownAssetsIncreased(intel({ unknownAssetCount: 0 }), intel({ unknownAssetCount: 1 }))).toBe(true);
  });

  it("never fires on no change or a real decrease", () => {
    expect(unknownAssetsIncreased(intel({ unknownAssetCount: 2 }), intel({ unknownAssetCount: 2 }))).toBe(false);
    expect(unknownAssetsIncreased(intel({ unknownAssetCount: 3 }), intel({ unknownAssetCount: 1 }))).toBe(false);
  });
});

describe("largestHoldingChanged", () => {
  it("previous:null never fires", () => {
    expect(largestHoldingChanged(null, intel())).toBe(false);
  });

  it("fires when the holding key (symbol + address) genuinely changes", () => {
    const eth = intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } });
    const usdc = intel({ largestHolding: { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 5000, allocationPct: 50 } });
    expect(largestHoldingChanged(eth, usdc)).toBe(true);
  });

  it("fires on a real null → holding transition, and the reverse", () => {
    const none = intel({ largestHolding: null });
    const some = intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } });
    expect(largestHoldingChanged(none, some)).toBe(true);
    expect(largestHoldingChanged(some, none)).toBe(true);
  });

  it("never fires when the same holding merely changes value/allocation — identity is symbol+address only", () => {
    const before = intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } });
    const after = intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 8000, allocationPct: 65 } });
    expect(largestHoldingChanged(before, after)).toBe(false);
  });

  it("distinguishes two different tokens that both have a null (native) address by symbol", () => {
    const eth = intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } });
    const matic = intel({ largestHolding: { symbol: "MATIC", name: "Polygon", address: null, usdValue: 5000, allocationPct: 50 } });
    expect(largestHoldingChanged(eth, matic)).toBe(true);
  });

  it("no real holding on either side never fires", () => {
    expect(largestHoldingChanged(intel({ largestHolding: null }), intel({ largestHolding: null }))).toBe(false);
  });
});

describe("portfolioValueChangedSignificantly", () => {
  it("previous:null never fires", () => {
    expect(portfolioValueChangedSignificantly(null, intel({ totalUsdValue: 10000 }))).toBe(false);
  });

  it("a real previous value of zero (or negative) never fires — no honest ratio to compute", () => {
    expect(portfolioValueChangedSignificantly(intel({ totalUsdValue: 0 }), intel({ totalUsdValue: 5000 }))).toBe(false);
  });

  it("below the real 5% ratio threshold fires nothing", () => {
    expect(portfolioValueChangedSignificantly(intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 10400 }))).toBe(false); // +4%
  });

  it("fires at and beyond the real 5% ratio threshold", () => {
    expect(portfolioValueChangedSignificantly(intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 10500 }))).toBe(true); // +5% exactly
    expect(portfolioValueChangedSignificantly(intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 12000 }))).toBe(true); // +20%
  });

  it("fires on a real decrease past the threshold too (relative-magnitude comparison)", () => {
    expect(portfolioValueChangedSignificantly(intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 9000 }))).toBe(true); // -10%
  });

  it("no change at all fires nothing", () => {
    expect(portfolioValueChangedSignificantly(intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 10000 }))).toBe(false);
  });
});

describe("purity — no predicate ever mutates its inputs", () => {
  it("every predicate leaves both snapshots exactly as given", () => {
    const prev = intel({ overallScore: 40, stablecoinExposure: 0 });
    const curr = intel({ overallScore: 90, stablecoinExposure: 30, unknownAssetCount: 2 });
    const prevBefore = structuredClone(prev);
    const currBefore = structuredClone(curr);

    concentrationJustExceededHigh(prev, curr);
    riskLevelChanged(prev, curr);
    scoreChangedSignificantly(prev, curr);
    healthChangedSignificantly(prev, curr);
    stablecoinExposureJustDropped(prev, curr);
    stablecoinExposureJustRecovered(prev, curr);
    pricingCoverageJustDropped(prev, curr);
    pricingCoverageJustRecovered(prev, curr);
    unknownAssetsIncreased(prev, curr);
    largestHoldingChanged(prev, curr);
    portfolioValueChangedSignificantly(prev, curr);

    expect(prev).toEqual(prevBefore);
    expect(curr).toEqual(currBefore);
  });
});

describe("determinism", () => {
  it("the same two snapshots always produce the same real verdict", () => {
    const prev = intel({ overallScore: 40 });
    const curr = intel({ overallScore: 90 });
    expect(scoreChangedSignificantly(prev, curr)).toBe(scoreChangedSignificantly(prev, curr));
    expect(concentrationJustExceededHigh(prev, curr)).toBe(concentrationJustExceededHigh(prev, curr));
  });
});
