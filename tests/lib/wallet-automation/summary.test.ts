import { describe, expect, it } from "vitest";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { buildContentEventCopy, buildLifecycleEventCopy } from "@/lib/wallet-automation/summary";

// Same fixture-builder convention already established in
// engine.test.ts, smart.test.ts, triggers.test.ts, and smartMetadata.test.ts.
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

// Mirrors production's own USD_FORMAT construction exactly, so expected
// values are computed the same real way rather than hand-guessed strings.
const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

describe("buildContentEventCopy — PortfolioScoreChanged", () => {
  it("with no previous snapshot, delta is 0 and reads as 'up'", () => {
    const copy = buildContentEventCopy("PortfolioScoreChanged", null, intel({ overallScore: 60 }));
    expect(copy.title).toBe("Portfolio score changed");
    expect(copy.summary).toBe("Overall score moved up to 60/100 (+0).");
  });

  it("names the real current score and a real positive delta", () => {
    const copy = buildContentEventCopy("PortfolioScoreChanged", intel({ overallScore: 40 }), intel({ overallScore: 70 }));
    expect(copy.summary).toBe("Overall score moved up to 70/100 (+30).");
  });

  it("names a real negative delta and reads as 'down'", () => {
    const copy = buildContentEventCopy("PortfolioScoreChanged", intel({ overallScore: 70 }), intel({ overallScore: 40 }));
    expect(copy.summary).toBe("Overall score moved down to 40/100 (-30).");
  });
});

describe("buildContentEventCopy — RiskLevelChanged", () => {
  it("with no previous snapshot, omits the 'was' clause entirely", () => {
    const copy = buildContentEventCopy("RiskLevelChanged", null, intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } }));
    expect(copy.title).toBe("Risk level changed");
    expect(copy.summary).toBe("Concentration risk is now high.");
  });

  it("names both the real current and real previous level when previous exists", () => {
    const copy = buildContentEventCopy(
      "RiskLevelChanged",
      intel({ concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" } }),
      intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } })
    );
    expect(copy.summary).toBe("Concentration risk is now high, was moderate.");
  });
});

describe("buildContentEventCopy — ConcentrationThresholdExceeded", () => {
  it("names the real largest holding's symbol and its real allocation percentage to one decimal", () => {
    const copy = buildContentEventCopy(
      "ConcentrationThresholdExceeded",
      null,
      intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 8200, allocationPct: 82.456 } })
    );
    expect(copy.title).toBe("High concentration detected");
    expect(copy.summary).toBe("ETH is now 82.5% of your known portfolio value.");
  });

  it("falls back to a real, honest generic sentence when there is no priced largest holding", () => {
    const copy = buildContentEventCopy("ConcentrationThresholdExceeded", null, intel({ largestHolding: null }));
    expect(copy.summary).toBe("Your portfolio is now highly concentrated in one asset.");
  });
});

describe("buildContentEventCopy — StablecoinExposureDropped", () => {
  it("is a fixed, real sentence — nothing to interpolate for a drop to exactly zero", () => {
    const copy = buildContentEventCopy("StablecoinExposureDropped", intel({ stablecoinExposure: 25 }), intel({ stablecoinExposure: 0 }));
    expect(copy.title).toBe("Stablecoin exposure dropped");
    expect(copy.summary).toBe("No defensive allocation detected — your stablecoin exposure is now 0%.");
  });
});

describe("buildContentEventCopy — StablecoinExposureRecovered", () => {
  it("names the real current stablecoin exposure to one decimal", () => {
    const copy = buildContentEventCopy("StablecoinExposureRecovered", intel({ stablecoinExposure: 0 }), intel({ stablecoinExposure: 12.34 }));
    expect(copy.title).toBe("Stablecoin exposure recovered");
    expect(copy.summary).toBe("Stablecoin exposure is back above 0% (12.3%).");
  });
});

describe("buildContentEventCopy — PricingCoverageDropped", () => {
  it("names the real current pricing coverage percentage", () => {
    const copy = buildContentEventCopy("PricingCoverageDropped", intel({ pricingCoverage: 100 }), intel({ pricingCoverage: 65 }));
    expect(copy.title).toBe("Pricing coverage dropped");
    expect(copy.summary).toBe("Only 65% of your holdings are priced — portfolio visibility is limited.");
  });
});

describe("buildContentEventCopy — PricingCoverageRecovered", () => {
  it("names the real current pricing coverage percentage", () => {
    const copy = buildContentEventCopy("PricingCoverageRecovered", intel({ pricingCoverage: 70 }), intel({ pricingCoverage: 95 }));
    expect(copy.title).toBe("Pricing coverage improved");
    expect(copy.summary).toBe("95% of your holdings are now priced.");
  });
});

describe("buildContentEventCopy — UnknownAssetsDetected", () => {
  it("uses the real singular 'asset' for exactly one unknown asset", () => {
    const copy = buildContentEventCopy("UnknownAssetsDetected", null, intel({ unknownAssetCount: 1 }));
    expect(copy.title).toBe("Unknown asset added");
    expect(copy.summary).toBe("1 asset in your wallet could not be priced — review recommended.");
  });

  it("uses the real plural 'assets' for more than one", () => {
    const copy = buildContentEventCopy("UnknownAssetsDetected", null, intel({ unknownAssetCount: 4 }));
    expect(copy.summary).toBe("4 assets in your wallet could not be priced — review recommended.");
  });

  it("uses the real plural 'assets' for the zero boundary too (not treated as singular)", () => {
    const copy = buildContentEventCopy("UnknownAssetsDetected", null, intel({ unknownAssetCount: 0 }));
    expect(copy.summary).toBe("0 assets in your wallet could not be priced — review recommended.");
  });
});

describe("buildContentEventCopy — LargestHoldingChanged", () => {
  const eth = { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 };
  const usdc = { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 5000, allocationPct: 50 };

  it("names both real symbols when both previous and current have a real largest holding", () => {
    const copy = buildContentEventCopy("LargestHoldingChanged", intel({ largestHolding: eth }), intel({ largestHolding: usdc }));
    expect(copy.title).toBe("Largest position changed");
    expect(copy.summary).toBe("Largest position changed from ETH to USDC.");
  });

  it("names only the real current symbol when there was no previous largest holding", () => {
    const copy = buildContentEventCopy("LargestHoldingChanged", intel({ largestHolding: null }), intel({ largestHolding: eth }));
    expect(copy.summary).toBe("Largest position is now ETH.");
  });

  it("names only the real current symbol when there is genuinely no previous snapshot at all", () => {
    const copy = buildContentEventCopy("LargestHoldingChanged", null, intel({ largestHolding: eth }));
    expect(copy.summary).toBe("Largest position is now ETH.");
  });

  it("falls back to the honest 'no priced holdings' sentence when the real current has none, regardless of what previous had", () => {
    const withPreviousHolding = buildContentEventCopy("LargestHoldingChanged", intel({ largestHolding: eth }), intel({ largestHolding: null }));
    const withNoPreviousHolding = buildContentEventCopy("LargestHoldingChanged", intel({ largestHolding: null }), intel({ largestHolding: null }));
    expect(withPreviousHolding.summary).toBe("No priced holdings remain to determine a largest position.");
    expect(withNoPreviousHolding.summary).toBe("No priced holdings remain to determine a largest position.");
  });
});

describe("buildContentEventCopy — PortfolioValueChanged", () => {
  it("with no previous snapshot, delta is a real 0 and formatted with the real USD format (+ sign, since delta >= 0)", () => {
    const copy = buildContentEventCopy("PortfolioValueChanged", null, intel({ totalUsdValue: 12000 }));
    expect(copy.title).toBe("Portfolio value changed");
    expect(copy.summary).toBe(`Known portfolio value is now ${USD_FORMAT.format(12000)} (+${USD_FORMAT.format(0)}).`);
  });

  it("names the real current value and a real, explicitly '+'-prefixed positive delta", () => {
    const copy = buildContentEventCopy("PortfolioValueChanged", intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 15000 }));
    expect(copy.summary).toBe(`Known portfolio value is now ${USD_FORMAT.format(15000)} (+${USD_FORMAT.format(5000)}).`);
  });

  it("names a real negative delta — Intl's own negative sign, never a double '+-' or a missing sign", () => {
    const copy = buildContentEventCopy("PortfolioValueChanged", intel({ totalUsdValue: 15000 }), intel({ totalUsdValue: 9000 }));
    expect(copy.summary).toBe(`Known portfolio value is now ${USD_FORMAT.format(9000)} (${USD_FORMAT.format(-6000)}).`);
    expect(copy.summary).not.toContain("+-");
  });
});

describe("buildContentEventCopy — exhaustiveness and purity", () => {
  it("every one of the real ContentEventKind's 10 members produces a non-empty title and summary", () => {
    const previous = intel({
      overallScore: 40,
      concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "" },
      stablecoinExposure: 20,
      pricingCoverage: 90,
      unknownAssetCount: 0,
      largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 },
      totalUsdValue: 10000,
    });
    const current = intel({
      overallScore: 80,
      concentrationRisk: { level: "high", topHoldingPct: 90, description: "" },
      stablecoinExposure: 0,
      pricingCoverage: 60,
      unknownAssetCount: 2,
      largestHolding: { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 9000, allocationPct: 90 },
      totalUsdValue: 15000,
    });

    const kinds = [
      "PortfolioScoreChanged",
      "RiskLevelChanged",
      "ConcentrationThresholdExceeded",
      "StablecoinExposureDropped",
      "StablecoinExposureRecovered",
      "PricingCoverageDropped",
      "PricingCoverageRecovered",
      "UnknownAssetsDetected",
      "LargestHoldingChanged",
      "PortfolioValueChanged",
    ] as const;
    // ContentEventKind genuinely has 10 members (not 9 — a count that appeared
    // in earlier PR-096 reporting was inaccurate; this list mirrors the real,
    // current union in lib/wallet-automation/summary.ts exactly).
    expect(kinds).toHaveLength(10);

    for (const kind of kinds) {
      const copy = buildContentEventCopy(kind, previous, current);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.summary.length).toBeGreaterThan(0);
    }
  });

  it("never mutates either snapshot it's given", () => {
    const previous = intel({ overallScore: 40 });
    const current = intel({ overallScore: 80, largestHolding: { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 1, allocationPct: 1 } });
    const previousBefore = structuredClone(previous);
    const currentBefore = structuredClone(current);

    buildContentEventCopy("PortfolioScoreChanged", previous, current);
    buildContentEventCopy("LargestHoldingChanged", previous, current);

    expect(previous).toEqual(previousBefore);
    expect(current).toEqual(currentBefore);
  });

  it("is fully deterministic — the same inputs always produce the same real copy", () => {
    const previous = intel({ overallScore: 40 });
    const current = intel({ overallScore: 80 });
    expect(buildContentEventCopy("PortfolioScoreChanged", previous, current)).toEqual(buildContentEventCopy("PortfolioScoreChanged", previous, current));
  });
});

describe("buildLifecycleEventCopy", () => {
  // Static per-kind copy — unlike buildContentEventCopy, these 4 kinds
  // describe a lifecycle transition (connect/disconnect/network/refresh),
  // never a portfolio-content change, so there is real, already-computed
  // PortfolioIntelligence data to interpolate here at all — the exact real
  // text itself is the entire contract to verify.

  it("WalletConnected — names what wallet automation is now doing, exactly", () => {
    const copy = buildLifecycleEventCopy("WalletConnected");
    expect(copy).toEqual({ title: "Wallet connected", summary: "Wallet automation is now watching this wallet's portfolio." });
  });

  it("WalletDisconnected — names the real paused state, exactly", () => {
    const copy = buildLifecycleEventCopy("WalletDisconnected");
    expect(copy).toEqual({ title: "Wallet disconnected", summary: "Wallet automation is paused until a wallet reconnects." });
  });

  it("UnsupportedNetwork — names the real required action, exactly", () => {
    const copy = buildLifecycleEventCopy("UnsupportedNetwork");
    expect(copy).toEqual({ title: "Unsupported network", summary: "Switch to a supported Base network to resume wallet automation." });
  });

  it("RefreshCompleted — names the real completed action, exactly", () => {
    const copy = buildLifecycleEventCopy("RefreshCompleted");
    expect(copy).toEqual({ title: "Refresh completed", summary: "Your portfolio was refreshed with the latest on-chain data." });
  });

  it("every one of the real LifecycleEventKind's 4 members produces a non-empty, distinct title and summary", () => {
    const kinds = ["WalletConnected", "WalletDisconnected", "UnsupportedNetwork", "RefreshCompleted"] as const;
    const copies = kinds.map((kind) => buildLifecycleEventCopy(kind));

    for (const copy of copies) {
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.summary.length).toBeGreaterThan(0);
    }
    // Every kind gets its own real, distinguishable copy — never a shared generic fallback.
    expect(new Set(copies.map((copy) => copy.title)).size).toBe(kinds.length);
    expect(new Set(copies.map((copy) => copy.summary)).size).toBe(kinds.length);
  });

  it("is fully deterministic — the same kind always produces the same real copy", () => {
    expect(buildLifecycleEventCopy("WalletConnected")).toEqual(buildLifecycleEventCopy("WalletConnected"));
  });

  it("never depends on or reads any external/global state — same kind, same real copy, called repeatedly in any order", () => {
    const first = buildLifecycleEventCopy("RefreshCompleted");
    buildLifecycleEventCopy("WalletDisconnected");
    buildLifecycleEventCopy("UnsupportedNetwork");
    const second = buildLifecycleEventCopy("RefreshCompleted");
    expect(first).toEqual(second);
  });
});
