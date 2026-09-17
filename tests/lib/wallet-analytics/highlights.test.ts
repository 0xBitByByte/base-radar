import { describe, expect, it } from "vitest";

import { buildAnalyticsHighlights } from "@/lib/wallet-analytics/highlights";
import { buildWalletAnalytics } from "@/lib/wallet-analytics/engine";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

function snapshot(overrides: Partial<AutomationSnapshot> & { timestamp: string }): AutomationSnapshot {
  return {
    analyticsVersion: 1,
    overallScore: 60,
    healthScore: 65,
    riskScore: 30,
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Mixed",
    largestHoldingSymbol: "ETH",
    largestProtocolName: null,
    primaryRecommendationId: null,
    topWarningId: null,
    totalValue: 10000,
    stablecoinExposure: 20,
    ethPct: 50,
    diversificationScore: 70,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    warningIds: [],
    topHoldings: [{ symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 }],
    ...overrides,
  };
}

const NOW = "2026-02-01T00:00:00.000Z";

describe("highlights.ts — buildAnalyticsHighlights", () => {
  it("empty history — no highlights, never a fabricated entry", () => {
    const analytics = buildWalletAnalytics([], [], "all", NOW);
    expect(analytics.highlights).toEqual([]);
  });

  it("single snapshot — no trend/recovery/stability highlights possible, but every milestone/personal-best is trivially and honestly 'fresh' (the one real snapshot IS the current record for everything) — matching this module's established single-data-point precedent elsewhere (see `comparison.ts`'s `mostStableAsset`)", () => {
    const analytics = buildWalletAnalytics([snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })], [], "all", NOW);
    expect(analytics.highlights.every((h) => h.type === "newPersonalBest" || h.type === "milestone")).toBe(true);
    expect(analytics.highlights.some((h) => h.type === "biggestImprovement" || h.type === "recovery" || h.type === "stabilityChange")).toBe(false);
    // 5 personalBests topics + 2 milestone-only topics (stablecoin/eth allocation), no dedup collisions since every topic is distinct
    expect(analytics.highlights).toHaveLength(7);
  });

  it("a fully flat history still produces one honest 'Very Stable' highlight — not zero", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-03T00:00:00.000Z" })];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    expect(analytics.highlights).toHaveLength(1);
    expect(analytics.highlights[0].type).toBe("stabilityChange");
    expect(analytics.highlights[0].stars).toBe(2);
  });

  it("a real biggest improvement produces a 'biggestImprovement' highlight with the real magnitude, priority 'important', 4 stars", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const highlight = analytics.highlights.find((h) => h.type === "biggestImprovement");
    expect(highlight).toBeDefined();
    expect(highlight?.priority).toBe("important");
    expect(highlight?.stars).toBe(4);
    expect(highlight?.topic).toBe("health");
    expect(highlight?.supportingMetric).toBe("Magnitude: 40");
  });

  it("a real biggest decline produces a 'biggestDecline' highlight, priority 'critical', 5 stars — the top of the ranking", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 90 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 50 })];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    expect(analytics.highlights[0].type).toBe("biggestDecline");
    expect(analytics.highlights[0].priority).toBe("critical");
    expect(analytics.highlights[0].stars).toBe(5);
  });

  it("a pure allocation-mix shift (ethAllocation, no matching Trend) becomes 'majorAllocationShift', never a fabricated improve/decline judgment", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 65, ethPct: 50 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 66, ethPct: 85 }), // health barely moves; ETH allocation moves a lot
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const highlight = analytics.highlights.find((h) => h.topic === "ethAllocation");
    expect(highlight?.type).toBe("majorAllocationShift");
  });

  it("DEDUP: Recovery from High Risk suppresses both Risk Reduced and Biggest Improvement for the same topic — the brief's own example", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 30 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 80 }), // enters High Risk
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", riskScore: 20 }), // recovers; also risk's own oldest->newest trend (30->20) reads "improving"
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const riskHighlights = analytics.highlights.filter((h) => h.topic === "risk");
    expect(riskHighlights).toHaveLength(1);
    expect(riskHighlights[0].type).toBe("recovery");
  });

  it("MILESTONE PRECEDENCE: a metric that is both the biggest improvement AND a fresh personal best surfaces only the higher-priority highlight", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 40 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 95 })];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const healthHighlights = analytics.highlights.filter((h) => h.topic === "health");
    expect(healthHighlights).toHaveLength(1);
    expect(healthHighlights[0].type).toBe("biggestImprovement"); // important(4) beats newPersonalBest positive(3)
  });

  it("a metric that improves and hits a fresh personal best, but ISN'T the biggest overall change, still dedupes to one survivor (confidenceImprovement over newPersonalBest)", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, confidenceScore: 80 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, confidenceScore: 95 }), // health is the biggest mover (delta 40); confidence also improves (delta 15) and hits a fresh all-time high
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    expect(analytics.biggestChange?.metric).toBe("health"); // sanity: confidence is NOT the biggest change here
    const confidenceHighlights = analytics.highlights.filter((h) => h.topic === "confidence");
    expect(confidenceHighlights).toHaveLength(1);
    expect(confidenceHighlights[0].type).toBe("confidenceImprovement");
  });

  it("a milestone NOT set at the most recent snapshot never produces a highlight — freshness is required, not just 'ever happened'", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 99 }), // the real all-time high, but NOT the most recent snapshot
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 65 }),
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    expect(analytics.highlights.some((h) => h.type === "newPersonalBest" && h.topic === "health")).toBe(false);
    // sanity: the milestone itself is still real and correctly recorded, just not "fresh"
    expect(analytics.milestones.highestHealthScore?.value).toBe(99);
  });

  it("MULTIPLE SIMULTANEOUS RECOVERIES: two different real recoveries (different topics) both survive — dedup never over-merges unrelated events", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 30, unknownAssetCount: 0 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 80, unknownAssetCount: 3 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", riskScore: 20, unknownAssetCount: 0 }),
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const recoveries = analytics.highlights.filter((h) => h.type === "recovery");
    expect(recoveries).toHaveLength(2);
    expect(recoveries.map((r) => r.topic).sort()).toEqual(["risk", "unknownAssets"]);
  });

  it("two recoveries of the SAME category (different times) dedup down to the most recent one only", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 20 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 80 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", riskScore: 20 }), // recovery 1
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", riskScore: 90 }),
      snapshot({ timestamp: "2026-01-05T00:00:00.000Z", riskScore: 20 }), // recovery 2, more recent
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const riskRecoveries = analytics.highlights.filter((h) => h.type === "recovery" && h.topic === "risk");
    expect(riskRecoveries).toHaveLength(1);
    expect(riskRecoveries[0].dedupeKey).toContain("2026-01-05");
  });

  it("PRIORITY ORDERING: the returned list is always sorted highest-priority (most stars) first", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 30, confidenceScore: 80, stablecoinExposure: 20 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 80, confidenceScore: 80, stablecoinExposure: 20 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", riskScore: 20, confidenceScore: 95, stablecoinExposure: 60 }), // risk recovers (important,4); confidence is the biggest real mover (important,4); stablecoin hits a fresh all-time high (a `milestone`, historical,1) — three distinct topics, spread across the priority tiers
    ];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const stars = analytics.highlights.map((h) => h.stars);
    expect(stars).toEqual([...stars].sort((a, b) => b - a));
  });

  it("is fully deterministic — same history/events/window/now produces byte-identical highlights", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    expect(buildWalletAnalytics(history, [], "all", NOW).highlights).toEqual(buildWalletAnalytics(history, [], "all", NOW).highlights);
  });

  it("buildAnalyticsHighlights never mutates the analytics object it's given", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const before = JSON.stringify(analytics);
    buildAnalyticsHighlights(analytics);
    expect(JSON.stringify(analytics)).toBe(before);
  });

  it("never recalculates anything blockchain/AI/Intelligence-related — purely synchronous over already-built fields", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const analytics = buildWalletAnalytics(history, [], "all", NOW);
    const result = buildAnalyticsHighlights(analytics);
    expect(result).not.toBeInstanceOf(Promise);
  });

  it("large history (300 snapshots) computes highlights within a reasonable time budget", () => {
    const history = Array.from({ length: 300 }, (_, i) =>
      snapshot({ timestamp: `2026-01-${String(Math.floor(i / 24) + 1).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00:00.000Z`, healthScore: 40 + (i % 60), riskScore: 20 + (i % 50) })
    );
    const start = performance.now();
    const analytics = buildWalletAnalytics(history, [], "all", "2026-03-01T00:00:00.000Z");
    expect(performance.now() - start).toBeLessThan(300);
    expect(Array.isArray(analytics.highlights)).toBe(true);
  });
});
