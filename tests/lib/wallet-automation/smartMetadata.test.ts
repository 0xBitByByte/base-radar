import { describe, expect, it } from "vitest";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { buildSmartMetadata } from "@/lib/wallet-automation/smartMetadata";

// Same fixture-builder convention already established in
// tests/lib/wallet-automation/engine.test.ts, smart.test.ts, and triggers.test.ts.
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

describe("buildSmartMetadata — severity", () => {
  it("is null when there is no real warning to derive it from", () => {
    const metadata = buildSmartMetadata(intel({ warnings: [] }), "general");
    expect(metadata.severity).toBeNull();
  });

  it("is the first real warning's own severity", () => {
    const metadata = buildSmartMetadata(
      intel({ warnings: [{ id: "w1", title: "W1", description: "", severity: "high" }] }),
      "general"
    );
    expect(metadata.severity).toBe("high");
  });

  it("uses only the FIRST warning when several exist", () => {
    const metadata = buildSmartMetadata(
      intel({
        warnings: [
          { id: "w1", title: "W1", description: "", severity: "moderate" },
          { id: "w2", title: "W2", description: "", severity: "high" },
        ],
      }),
      "general"
    );
    expect(metadata.severity).toBe("moderate");
  });

  it("reflects each real severity level honestly", () => {
    for (const severity of ["moderate", "elevated", "high"] as const) {
      const metadata = buildSmartMetadata(intel({ warnings: [{ id: "w1", title: "W1", description: "", severity }] }), "general");
      expect(metadata.severity).toBe(severity);
    }
  });
});

describe("buildSmartMetadata — confidence", () => {
  it("is a direct, unmodified read of current.confidenceScore, never recalculated", () => {
    expect(buildSmartMetadata(intel({ confidenceScore: 42 }), "general").confidence).toBe(42);
    expect(buildSmartMetadata(intel({ confidenceScore: 97 }), "general").confidence).toBe(97);
    expect(buildSmartMetadata(intel({ confidenceScore: 0 }), "general").confidence).toBe(0);
  });
});

describe("buildSmartMetadata — reason", () => {
  it("is null when there is neither a real negative contributor nor a real warning", () => {
    const metadata = buildSmartMetadata(intel({ negativeContributors: [], warnings: [] }), "general");
    expect(metadata.reason).toBeNull();
  });

  it("prefers the top negative contributor's own reason when one exists", () => {
    const metadata = buildSmartMetadata(
      intel({
        negativeContributors: [{ id: "c1", title: "C1", description: "", importance: "high", reason: "Top holding is 82% of known value." }],
        warnings: [{ id: "w1", title: "W1", description: "A different, lower-priority description.", severity: "high" }],
      }),
      "general"
    );
    expect(metadata.reason).toBe("Top holding is 82% of known value.");
  });

  it("falls back to the top warning's description when there is no real negative contributor", () => {
    const metadata = buildSmartMetadata(
      intel({ negativeContributors: [], warnings: [{ id: "w1", title: "W1", description: "No defensive allocation detected.", severity: "moderate" }] }),
      "general"
    );
    expect(metadata.reason).toBe("No defensive allocation detected.");
  });

  it("uses only the FIRST negative contributor and the FIRST warning, never a later one", () => {
    const metadata = buildSmartMetadata(
      intel({
        negativeContributors: [
          { id: "c1", title: "C1", description: "", importance: "high", reason: "First reason." },
          { id: "c2", title: "C2", description: "", importance: "low", reason: "Second reason." },
        ],
      }),
      "general"
    );
    expect(metadata.reason).toBe("First reason.");
  });

  it("an empty-string contributor reason is a real (falsy but defined) value and is not treated as absent", () => {
    // `??` only falls through on null/undefined, never on an empty string — this locks down that real, documented semantic.
    const metadata = buildSmartMetadata(
      intel({
        negativeContributors: [{ id: "c1", title: "C1", description: "", importance: "high", reason: "" }],
        warnings: [{ id: "w1", title: "W1", description: "Warning description.", severity: "high" }],
      }),
      "general"
    );
    expect(metadata.reason).toBe("");
  });
});

describe("buildSmartMetadata — relatedAssets (focus-gated)", () => {
  const holding = { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 };

  it("names the real largest holding's symbol for the top-contributor focus", () => {
    expect(buildSmartMetadata(intel({ largestHolding: holding }), "top-contributor").relatedAssets).toEqual(["ETH"]);
  });

  it("names the real largest holding's symbol for the top-warning focus too", () => {
    expect(buildSmartMetadata(intel({ largestHolding: holding }), "top-warning").relatedAssets).toEqual(["ETH"]);
  });

  it("is empty for the largest-protocol and general focuses, even with a real largest holding on file", () => {
    expect(buildSmartMetadata(intel({ largestHolding: holding }), "largest-protocol").relatedAssets).toEqual([]);
    expect(buildSmartMetadata(intel({ largestHolding: holding }), "general").relatedAssets).toEqual([]);
  });

  it("is empty for a relevant focus when there is genuinely no largest holding", () => {
    expect(buildSmartMetadata(intel({ largestHolding: null }), "top-contributor").relatedAssets).toEqual([]);
    expect(buildSmartMetadata(intel({ largestHolding: null }), "top-warning").relatedAssets).toEqual([]);
  });
});

describe("buildSmartMetadata — relatedProtocols (focus-gated)", () => {
  const protocol = { symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 1000, allocationPct: 10 };

  it("names the real largest protocol's name for the largest-protocol focus", () => {
    expect(buildSmartMetadata(intel({ largestProtocol: protocol }), "largest-protocol").relatedProtocols).toEqual(["Aerodrome Finance"]);
  });

  it("is empty for every other focus, even with a real largest protocol on file", () => {
    expect(buildSmartMetadata(intel({ largestProtocol: protocol }), "top-contributor").relatedProtocols).toEqual([]);
    expect(buildSmartMetadata(intel({ largestProtocol: protocol }), "top-warning").relatedProtocols).toEqual([]);
    expect(buildSmartMetadata(intel({ largestProtocol: protocol }), "general").relatedProtocols).toEqual([]);
  });

  it("is empty for the largest-protocol focus when there is genuinely no largest protocol", () => {
    expect(buildSmartMetadata(intel({ largestProtocol: null }), "largest-protocol").relatedProtocols).toEqual([]);
  });
});

describe("buildSmartMetadata — estimatedImpact (real buildAIActions integration, not mocked)", () => {
  it("is the honest 'low' default when there is no real recommendation to derive an impact from", () => {
    expect(buildSmartMetadata(intel({ recommendations: [] }), "general").estimatedImpact).toBe("low");
  });

  it("reflects the real top recommendation's own priority via the real buildAIActions mapping", () => {
    const highPriority = intel({ recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }] });
    const mediumPriority = intel({ recommendations: [{ id: "add-stablecoins", title: "", explanation: "", reason: "", priority: "medium" }] });
    const lowPriority = intel({ recommendations: [{ id: "review-dust", title: "", explanation: "", reason: "", priority: "low" }] });

    expect(buildSmartMetadata(highPriority, "general").estimatedImpact).toBe("high");
    expect(buildSmartMetadata(mediumPriority, "general").estimatedImpact).toBe("medium");
    expect(buildSmartMetadata(lowPriority, "general").estimatedImpact).toBe("low");
  });

  it("uses only the FIRST real recommendation's priority when several exist", () => {
    const metadata = buildSmartMetadata(
      intel({
        recommendations: [
          { id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" },
          { id: "add-stablecoins", title: "", explanation: "", reason: "", priority: "low" },
        ],
      }),
      "general"
    );
    expect(metadata.estimatedImpact).toBe("high");
  });

  it("is unaffected by focus — estimatedImpact never varies with the metadata focus", () => {
    const withRec = intel({ recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }] });
    const focuses: Array<Parameters<typeof buildSmartMetadata>[1]> = ["top-contributor", "top-warning", "largest-protocol", "general"];
    for (const focus of focuses) {
      expect(buildSmartMetadata(withRec, focus).estimatedImpact).toBe("high");
    }
  });
});

describe("buildSmartMetadata — structural completeness across every real focus", () => {
  it("returns a fully well-formed WalletEventMetadata object for every real SmartMetadataFocus value", () => {
    const current = intel({
      warnings: [{ id: "w1", title: "W1", description: "d", severity: "high" }],
      negativeContributors: [{ id: "c1", title: "C1", description: "", importance: "high", reason: "r" }],
      recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }],
      largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 1, allocationPct: 1 },
      largestProtocol: { symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 1, allocationPct: 1 },
    });
    for (const focus of ["top-contributor", "top-warning", "largest-protocol", "general"] as const) {
      const metadata = buildSmartMetadata(current, focus);
      expect(metadata).toMatchObject({
        severity: "high",
        confidence: current.confidenceScore,
        reason: "r",
        estimatedImpact: "high",
      });
      expect(Array.isArray(metadata.relatedAssets)).toBe(true);
      expect(Array.isArray(metadata.relatedProtocols)).toBe(true);
    }
  });
});

describe("buildSmartMetadata — purity and determinism", () => {
  it("never mutates the given PortfolioIntelligence snapshot", () => {
    const current = intel({
      warnings: [{ id: "w1", title: "W1", description: "d", severity: "high" }],
      recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }],
    });
    const before = structuredClone(current);
    buildSmartMetadata(current, "top-contributor");
    expect(current).toEqual(before);
  });

  it("is fully deterministic — the same input always produces the same real output", () => {
    const current = intel({ recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }] });
    expect(buildSmartMetadata(current, "general")).toEqual(buildSmartMetadata(current, "general"));
  });
});
