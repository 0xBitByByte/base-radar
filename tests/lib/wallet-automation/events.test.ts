import { describe, expect, it } from "vitest";

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import { buildLifecycleEvents, buildPortfolioContentEvents, buildSmartPortfolioEvents } from "@/lib/wallet-automation/events";
import type { WalletLifecycleState } from "@/lib/wallet-automation/types";

// Same fixture-builder convention already established in engine.test.ts,
// smart.test.ts, triggers.test.ts, smartMetadata.test.ts, and summary.test.ts.
//
// This file deliberately does NOT re-test what engine.test.ts and
// smart.test.ts already cover well: the basic "does this predicate produce
// an event at all" cases for ConcentrationThresholdExceeded,
// RiskLevelChanged, StablecoinExposureDropped/Recovered,
// PricingCoverageDropped, UnknownAssetsDetected, LargestHoldingChanged,
// WalletConnected/Disconnected, and the trivial UnsupportedNetwork/
// RefreshCompleted true/false pairs — those are already real, passing
// coverage. This file closes what those two files genuinely leave
// untested: events.ts's OWN orchestration logic (tone assignment, event id/
// timestamp/metadata construction, the METADATA_FOCUS_BY_KIND routing
// table, multiple-simultaneous-event behavior, and two real branches —
// PortfolioScoreChanged, PricingCoverageRecovered, and the chainSupported
// half of UnsupportedNetwork's condition — that no existing test exercises
// at all).
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

function lifecycle(overrides: Partial<WalletLifecycleState> = {}): WalletLifecycleState {
  return { isConnected: false, isSupportedNetwork: true, chainSupported: true, lastUpdated: null, ...overrides };
}

describe("buildPortfolioContentEvents — genuinely untested kinds", () => {
  it("PortfolioScoreChanged fires on a real >=3-point overallScore move, with the real correct tone in each direction", () => {
    const up = buildPortfolioContentEvents(intel({ overallScore: 40 }), intel({ overallScore: 70 }));
    const upEvent = up.find((e) => e.kind === "PortfolioScoreChanged");
    expect(upEvent).toBeDefined();
    expect(upEvent?.tone).toBe("positive");

    const down = buildPortfolioContentEvents(intel({ overallScore: 70 }), intel({ overallScore: 40 }));
    const downEvent = down.find((e) => e.kind === "PortfolioScoreChanged");
    expect(downEvent).toBeDefined();
    expect(downEvent?.tone).toBe("attention");
  });

  it("PortfolioScoreChanged never fires below the real threshold", () => {
    const events = buildPortfolioContentEvents(intel({ overallScore: 60 }), intel({ overallScore: 61 }));
    expect(events.some((e) => e.kind === "PortfolioScoreChanged")).toBe(false);
  });

  it("PricingCoverageRecovered fires on a real <80%->>=80% crossing, with a real positive tone", () => {
    const events = buildPortfolioContentEvents(intel({ pricingCoverage: 60 }), intel({ pricingCoverage: 90 }));
    const event = events.find((e) => e.kind === "PricingCoverageRecovered");
    expect(event).toBeDefined();
    expect(event?.tone).toBe("positive");
  });

  it("PricingCoverageRecovered never fires while still below the real threshold", () => {
    const events = buildPortfolioContentEvents(intel({ pricingCoverage: 40 }), intel({ pricingCoverage: 70 }));
    expect(events.some((e) => e.kind === "PricingCoverageRecovered")).toBe(false);
  });
});

describe("buildPortfolioContentEvents — real tone assignment (events.ts's own orchestration logic)", () => {
  it("RiskLevelChanged reads 'attention' when the new level is high or elevated, 'neutral' otherwise", () => {
    const toHigh = buildPortfolioContentEvents(
      intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } }),
      intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } })
    );
    expect(toHigh.find((e) => e.kind === "RiskLevelChanged")?.tone).toBe("attention");

    const toElevated = buildPortfolioContentEvents(
      intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } }),
      intel({ concentrationRisk: { level: "elevated", topHoldingPct: 65, description: "" } })
    );
    expect(toElevated.find((e) => e.kind === "RiskLevelChanged")?.tone).toBe("attention");

    const toModerate = buildPortfolioContentEvents(
      intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } }),
      intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } })
    );
    expect(toModerate.find((e) => e.kind === "RiskLevelChanged")?.tone).toBe("neutral");
  });

  it("PortfolioValueChanged reads 'positive' on a real increase, 'attention' on a real decrease", () => {
    const up = buildPortfolioContentEvents(intel({ totalUsdValue: 10000 }), intel({ totalUsdValue: 12000 }));
    expect(up.find((e) => e.kind === "PortfolioValueChanged")?.tone).toBe("positive");

    const down = buildPortfolioContentEvents(intel({ totalUsdValue: 12000 }), intel({ totalUsdValue: 10000 }));
    expect(down.find((e) => e.kind === "PortfolioValueChanged")?.tone).toBe("attention");
  });

  it("every other content kind has its own fixed, real tone", () => {
    const concentration = buildPortfolioContentEvents(
      intel({ concentrationRisk: { level: "moderate", topHoldingPct: 40, description: "" } }),
      intel({ concentrationRisk: { level: "high", topHoldingPct: 90, description: "" } })
    );
    expect(concentration.find((e) => e.kind === "ConcentrationThresholdExceeded")?.tone).toBe("attention");

    const stableDrop = buildPortfolioContentEvents(intel({ stablecoinExposure: 15 }), intel({ stablecoinExposure: 0 }));
    expect(stableDrop.find((e) => e.kind === "StablecoinExposureDropped")?.tone).toBe("attention");

    const stableRecover = buildPortfolioContentEvents(intel({ stablecoinExposure: 0 }), intel({ stablecoinExposure: 15 }));
    expect(stableRecover.find((e) => e.kind === "StablecoinExposureRecovered")?.tone).toBe("positive");

    const pricingDrop = buildPortfolioContentEvents(intel({ pricingCoverage: 90 }), intel({ pricingCoverage: 60 }));
    expect(pricingDrop.find((e) => e.kind === "PricingCoverageDropped")?.tone).toBe("attention");

    const unknown = buildPortfolioContentEvents(intel({ unknownAssetCount: 0 }), intel({ unknownAssetCount: 1 }));
    expect(unknown.find((e) => e.kind === "UnknownAssetsDetected")?.tone).toBe("neutral");

    const holding = buildPortfolioContentEvents(
      intel({ largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } }),
      intel({ largestHolding: { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 6000, allocationPct: 60 } })
    );
    expect(holding.find((e) => e.kind === "LargestHoldingChanged")?.tone).toBe("neutral");
  });
});

describe("buildPortfolioContentEvents — real event construction", () => {
  it("every content event's id is deterministic ('wallet-event:<kind>:<timestamp>') and timestamp is current.lastUpdated", () => {
    const current = intel({ overallScore: 90, lastUpdated: "2026-09-10T12:00:00.000Z" });
    const events = buildPortfolioContentEvents(intel({ overallScore: 40 }), current);
    const scoreEvent = events.find((e) => e.kind === "PortfolioScoreChanged")!;
    expect(scoreEvent.id).toBe(`wallet-event:PortfolioScoreChanged:${current.lastUpdated}`);
    expect(scoreEvent.timestamp).toBe(current.lastUpdated);
  });

  it("content events never carry metadata — that is exclusively a smart-tier field", () => {
    const events = buildPortfolioContentEvents(intel({ overallScore: 40 }), intel({ overallScore: 90 }));
    for (const event of events) {
      expect(event.metadata).toBeUndefined();
    }
  });
});

describe("buildPortfolioContentEvents — multiple simultaneous matches", () => {
  it("multiple genuinely distinct real transitions in one call all produce their own event, in the function's own declaration order, with no cross-contamination", () => {
    const previous = intel({ overallScore: 40, stablecoinExposure: 15, largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 } });
    const current = intel({
      overallScore: 90,
      stablecoinExposure: 0,
      largestHolding: { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 6000, allocationPct: 60 },
    });

    const events = buildPortfolioContentEvents(previous, current);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toEqual(["PortfolioScoreChanged", "StablecoinExposureDropped", "LargestHoldingChanged"]);

    // Every real id is genuinely distinct — no accidental collision across simultaneous kinds sharing the same timestamp.
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("an unrelated field changing produces exactly zero extra events beyond the real ones that actually transitioned", () => {
    const events = buildPortfolioContentEvents(
      intel({ overallScore: 40, riskScore: 10 }), // riskScore isn't read by any of these 10 kinds
      intel({ overallScore: 90, riskScore: 99 })
    );
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("PortfolioScoreChanged");
  });
});

describe("buildSmartPortfolioEvents — every real smart kind actually fires and carries real metadata", () => {
  it("ConfidenceDropped fires with 'attention' tone and real metadata", () => {
    const events = buildSmartPortfolioEvents(intel({ confidenceScore: 90 }), intel({ confidenceScore: 50 }));
    const event = events.find((e) => e.kind === "ConfidenceDropped");
    expect(event).toBeDefined();
    expect(event?.tone).toBe("attention");
    expect(event?.metadata).toBeDefined();
  });

  it("FingerprintChanged fires with 'neutral' tone", () => {
    const events = buildSmartPortfolioEvents(intel({ fingerprint: "Balanced" }), intel({ fingerprint: "Concentrated" }));
    expect(events.find((e) => e.kind === "FingerprintChanged")?.tone).toBe("neutral");
  });

  it("PrimaryRecommendationChanged fires with 'neutral' tone", () => {
    const events = buildSmartPortfolioEvents(
      intel({ recommendations: [] }),
      intel({ recommendations: [{ id: "reduce-concentration", title: "", explanation: "", reason: "", priority: "high" }] })
    );
    expect(events.find((e) => e.kind === "PrimaryRecommendationChanged")?.tone).toBe("neutral");
  });

  it("RiskIncreased fires with 'attention' tone, RiskDecreased with 'positive' tone", () => {
    const up = buildSmartPortfolioEvents(intel({ riskScore: 20 }), intel({ riskScore: 60 }));
    expect(up.find((e) => e.kind === "RiskIncreased")?.tone).toBe("attention");

    const down = buildSmartPortfolioEvents(intel({ riskScore: 60 }), intel({ riskScore: 20 }));
    expect(down.find((e) => e.kind === "RiskDecreased")?.tone).toBe("positive");
  });

  it("LargestProtocolChanged fires with 'neutral' tone and metadata.relatedProtocols names the real new protocol (the real METADATA_FOCUS_BY_KIND routing)", () => {
    const aero = { symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 1, allocationPct: 1 };
    const events = buildSmartPortfolioEvents(intel({ largestProtocol: null }), intel({ largestProtocol: aero }));
    const event = events.find((e) => e.kind === "LargestProtocolChanged");
    expect(event?.tone).toBe("neutral");
    expect(event?.metadata?.relatedProtocols).toEqual(["Aerodrome Finance"]);
    expect(event?.metadata?.relatedAssets).toEqual([]); // this kind's real focus never populates relatedAssets
  });

  it("TopContributorChanged fires with 'attention' tone and metadata.relatedAssets names the real largest holding (the real METADATA_FOCUS_BY_KIND routing)", () => {
    const events = buildSmartPortfolioEvents(
      intel({ negativeContributors: [] }),
      intel({
        negativeContributors: [{ id: "health:concentration-risk", title: "Concentration Risk", description: "", importance: "high", reason: "" }],
        largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 1, allocationPct: 1 },
      })
    );
    const event = events.find((e) => e.kind === "TopContributorChanged");
    expect(event?.tone).toBe("attention");
    expect(event?.metadata?.relatedAssets).toEqual(["ETH"]);
  });

  it("TopWarningChanged fires with 'attention' tone and metadata.relatedAssets names the real largest holding too", () => {
    const events = buildSmartPortfolioEvents(
      intel({ warnings: [] }),
      intel({
        warnings: [{ id: "concentration-high", title: "Heavy concentration", description: "", severity: "high" }],
        largestHolding: { symbol: "ETH", name: "ETH", address: null, usdValue: 1, allocationPct: 1 },
      })
    );
    const event = events.find((e) => e.kind === "TopWarningChanged");
    expect(event?.tone).toBe("attention");
    expect(event?.metadata?.relatedAssets).toEqual(["ETH"]);
    expect(event?.metadata?.severity).toBe("high"); // the real top warning's own severity, per smartMetadata's own contract
  });

  it("a 'general'-focus kind (e.g. ConfidenceIncreased) never populates relatedAssets or relatedProtocols", () => {
    const events = buildSmartPortfolioEvents(intel({ confidenceScore: 50 }), intel({ confidenceScore: 90 }));
    const event = events.find((e) => e.kind === "ConfidenceIncreased");
    expect(event?.metadata?.relatedAssets).toEqual([]);
    expect(event?.metadata?.relatedProtocols).toEqual([]);
  });
});

describe("buildSmartPortfolioEvents — real event construction and multiple simultaneous matches", () => {
  it("every smart event's id is deterministic and its timestamp is current.lastUpdated", () => {
    const current = intel({ confidenceScore: 90, lastUpdated: "2026-09-10T12:00:00.000Z" });
    const events = buildSmartPortfolioEvents(intel({ confidenceScore: 50 }), current);
    const event = events.find((e) => e.kind === "ConfidenceIncreased")!;
    expect(event.id).toBe(`wallet-event:ConfidenceIncreased:${current.lastUpdated}`);
    expect(event.timestamp).toBe(current.lastUpdated);
  });

  it("multiple genuinely distinct real smart transitions in one call all produce their own event, in the function's own declaration order", () => {
    const previous = intel({ confidenceScore: 90, riskScore: 20 });
    const current = intel({ confidenceScore: 50, riskScore: 60 }); // confidence dropped AND risk increased
    const events = buildSmartPortfolioEvents(previous, current);
    expect(events.map((e) => e.kind)).toEqual(["ConfidenceDropped", "RiskIncreased"]);
  });
});

describe("buildLifecycleEvents — the genuinely untested chainSupported branch", () => {
  it("UnsupportedNetwork fires when chainSupported alone is lost, even with isSupportedNetwork still true", () => {
    const previous = lifecycle({ isConnected: true, isSupportedNetwork: true, chainSupported: true, lastUpdated: "t1" });
    const current = lifecycle({ isConnected: true, isSupportedNetwork: true, chainSupported: false, lastUpdated: "t1" });
    expect(buildLifecycleEvents(previous, current, "t").some((e) => e.kind === "UnsupportedNetwork")).toBe(true);
  });

  it("UnsupportedNetwork does not fire while disconnected, even if chainSupported was lost", () => {
    const previous = lifecycle({ isConnected: false, chainSupported: true });
    const current = lifecycle({ isConnected: false, chainSupported: false });
    expect(buildLifecycleEvents(previous, current, "t").some((e) => e.kind === "UnsupportedNetwork")).toBe(false);
  });
});

describe("buildLifecycleEvents — the genuinely untested RefreshCompleted null-regression guard", () => {
  it("never fires RefreshCompleted when lastUpdated regresses to null, even though it genuinely changed", () => {
    const previous = lifecycle({ isConnected: true, lastUpdated: "t1" });
    const current = lifecycle({ isConnected: true, lastUpdated: null });
    expect(buildLifecycleEvents(previous, current, "t").some((e) => e.kind === "RefreshCompleted")).toBe(false);
  });
});

describe("buildLifecycleEvents — multiple simultaneous matches", () => {
  it("connecting with a real, fresh lastUpdated fires both WalletConnected and RefreshCompleted together", () => {
    const previous = lifecycle({ isConnected: false, lastUpdated: null });
    const current = lifecycle({ isConnected: true, lastUpdated: "t1" });
    const events = buildLifecycleEvents(previous, current, "t");
    expect(events.map((e) => e.kind)).toEqual(["WalletConnected", "RefreshCompleted"]);
  });

  it("fully disconnecting from a previously-unsupported-network connected state fires only WalletDisconnected, never a lingering UnsupportedNetwork", () => {
    const previous = lifecycle({ isConnected: true, isSupportedNetwork: false, lastUpdated: "t1" });
    const current = lifecycle({ isConnected: false, isSupportedNetwork: false, lastUpdated: "t1" });
    const events = buildLifecycleEvents(previous, current, "t");
    expect(events.map((e) => e.kind)).toEqual(["WalletDisconnected"]);
  });
});

describe("buildLifecycleEvents — real event construction", () => {
  it("uses the real caller-supplied timestamp (never derived from the lifecycle state itself) for both id and timestamp", () => {
    const previous = lifecycle({ isConnected: false });
    const current = lifecycle({ isConnected: true, lastUpdated: "t1" });
    const events = buildLifecycleEvents(previous, current, "2026-09-10T12:00:00.000Z");
    const event = events.find((e) => e.kind === "WalletConnected")!;
    expect(event.id).toBe("wallet-event:WalletConnected:2026-09-10T12:00:00.000Z");
    expect(event.timestamp).toBe("2026-09-10T12:00:00.000Z");
  });

  it("lifecycle events never carry metadata either", () => {
    const previous = lifecycle({ isConnected: false });
    const current = lifecycle({ isConnected: true, lastUpdated: "t1" });
    const events = buildLifecycleEvents(previous, current, "t");
    for (const event of events) {
      expect(event.metadata).toBeUndefined();
    }
  });
});

describe("determinism across all three builders", () => {
  it("identical inputs always produce identical real output", () => {
    const previous = intel({ overallScore: 40 });
    const current = intel({ overallScore: 90 });
    expect(buildPortfolioContentEvents(previous, current)).toEqual(buildPortfolioContentEvents(previous, current));
    expect(buildSmartPortfolioEvents(previous, current)).toEqual(buildSmartPortfolioEvents(previous, current));

    const prevLifecycle = lifecycle({ isConnected: false });
    const currLifecycle = lifecycle({ isConnected: true, lastUpdated: "t1" });
    expect(buildLifecycleEvents(prevLifecycle, currLifecycle, "t")).toEqual(buildLifecycleEvents(prevLifecycle, currLifecycle, "t"));
  });
});

describe("purity — none of the three builders mutate their inputs", () => {
  it("buildPortfolioContentEvents never mutates previous or current", () => {
    const previous = intel({ overallScore: 40, stablecoinExposure: 15 });
    const current = intel({ overallScore: 90, stablecoinExposure: 0, largestHolding: { symbol: "USDC", name: "USD Coin", address: "0xusdc", usdValue: 1, allocationPct: 1 } });
    const previousBefore = structuredClone(previous);
    const currentBefore = structuredClone(current);

    buildPortfolioContentEvents(previous, current);

    expect(previous).toEqual(previousBefore);
    expect(current).toEqual(currentBefore);
  });

  it("buildSmartPortfolioEvents never mutates previous or current", () => {
    const previous = intel({ confidenceScore: 90, riskScore: 20 });
    const current = intel({ confidenceScore: 50, riskScore: 60 });
    const previousBefore = structuredClone(previous);
    const currentBefore = structuredClone(current);

    buildSmartPortfolioEvents(previous, current);

    expect(previous).toEqual(previousBefore);
    expect(current).toEqual(currentBefore);
  });

  it("buildLifecycleEvents never mutates previous or current", () => {
    const previous = lifecycle({ isConnected: false });
    const current = lifecycle({ isConnected: true, lastUpdated: "t1" });
    const previousBefore = structuredClone(previous);
    const currentBefore = structuredClone(current);

    buildLifecycleEvents(previous, current, "t");

    expect(previous).toEqual(previousBefore);
    expect(current).toEqual(currentBefore);
  });
});
