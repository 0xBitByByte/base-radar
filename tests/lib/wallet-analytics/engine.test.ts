import { describe, expect, it } from "vitest";

import { buildAllocationAnalytics } from "@/lib/wallet-analytics/allocation";
import { buildBiggestChange } from "@/lib/wallet-analytics/biggestChange";
import { buildPortfolioEvolution } from "@/lib/wallet-analytics/comparison";
import { categoricalTrendConfidence, numericTrendConfidence } from "@/lib/wallet-analytics/confidence";
import { buildWalletAnalytics } from "@/lib/wallet-analytics/engine";
import { appendSnapshot, historyBounds } from "@/lib/wallet-analytics/history";
import { buildAnalyticsExecutiveSummary } from "@/lib/wallet-analytics/summary";
import { buildAnalyticsTimeline } from "@/lib/wallet-analytics/timeline";
import { buildTrends } from "@/lib/wallet-analytics/trend";
import type { AutomationSnapshot, WalletEvent } from "@/lib/wallet-automation/types";
import * as WalletAnalyticsPublicApi from "@/lib/wallet-analytics/index";

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

function walletEvent(overrides: Partial<WalletEvent> & { id: string; timestamp: string }): WalletEvent {
  return { kind: "PortfolioScoreChanged", title: "Portfolio score changed", summary: "", tone: "neutral", ...overrides };
}

describe("history.ts", () => {
  it("appends a genuinely new snapshot", () => {
    const history = appendSnapshot([], snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }));
    expect(history).toHaveLength(1);
    const next = appendSnapshot(history, snapshot({ timestamp: "2026-01-02T00:00:00.000Z" }));
    expect(next).toHaveLength(2);
  });

  it("never grows history for a refresh with an identical timestamp — no duplicate entries", () => {
    const first = appendSnapshot([], snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }));
    const same = appendSnapshot(first, snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 99 }));
    expect(same).toHaveLength(1);
    expect(same[0].healthScore).toBe(65); // the original entry, not silently replaced
  });

  it("caps at maxLength, dropping the oldest first", () => {
    let history: AutomationSnapshot[] = [];
    for (let i = 0; i < 5; i++) {
      history = appendSnapshot(history, snapshot({ timestamp: `2026-01-0${i + 1}T00:00:00.000Z` }), 3);
    }
    expect(history).toHaveLength(3);
    expect(history[0].timestamp).toBe("2026-01-03T00:00:00.000Z");
  });

  it("historyBounds handles empty history honestly", () => {
    expect(historyBounds([])).toEqual({ first: null, last: null });
  });
});

describe("trend.ts — buildTrends", () => {
  it("empty history — every trend is honestly 'unknown', no crash", () => {
    const trends = buildTrends([]);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends.every((t) => t.direction === "unknown")).toBe(true);
    expect(trends.every((t) => t.confidence === "unknown")).toBe(true);
  });

  it("single snapshot — still 'unknown', a single point has no trajectory", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })]);
    expect(trends.every((t) => t.direction === "unknown")).toBe(true);
    expect(trends.every((t) => t.confidence === "unknown")).toBe(true);
  });

  it("every trend carries a real confidence rating once there's enough history", () => {
    const history = Array.from({ length: 6 }, (_, i) => snapshot({ timestamp: `2026-01-0${i + 1}T00:00:00.000Z`, healthScore: 40 + i * 8 }));
    const trends = buildTrends(history);
    expect(trends.every((t) => ["high", "medium", "low", "unknown"].includes(t.confidence))).toBe(true);
    expect(trends.find((t) => t.metric === "health")!.confidence).toBe("high");
  });

  it("regression: a consistently IMPROVING (inverted) risk trend gets real confidence credit, not artificially low — risk's raw values fall while its label reads 'improving'", () => {
    const history = Array.from({ length: 6 }, (_, i) => snapshot({ timestamp: `2026-01-0${i + 1}T00:00:00.000Z`, riskScore: 80 - i * 8 }));
    const trends = buildTrends(history);
    const risk = trends.find((t) => t.metric === "risk")!;
    expect(risk.direction).toBe("improving"); // lower risk score is better
    expect(risk.confidence).toBe("high"); // consistently, monotonically improving — should never read as "low"
  });

  it("health improvement is classified correctly with real from/to/delta", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 60 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 82 })]);
    const health = trends.find((t) => t.metric === "health")!;
    expect(health.direction).toBe("improving");
    expect(health.from).toBe(60);
    expect(health.to).toBe(82);
    expect(health.delta).toBe(22);
  });

  it("health decline is classified correctly", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 82 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 60 })]);
    expect(trends.find((t) => t.metric === "health")!.direction).toBe("declining");
  });

  it("a change below the real threshold reads as stable, never fabricated movement", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 70 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 71 })]);
    expect(trends.find((t) => t.metric === "health")!.direction).toBe("stable");
  });

  it("confidence changes (both directions) are classified correctly", () => {
    const improved = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", confidenceScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", confidenceScore: 90 })]);
    expect(improved.find((t) => t.metric === "confidence")!.direction).toBe("improving");
    const dropped = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", confidenceScore: 90 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", confidenceScore: 50 })]);
    expect(dropped.find((t) => t.metric === "confidence")!.direction).toBe("declining");
  });

  it("risk is inverted — a DECREASE in risk score is 'improving', an increase is 'declining'", () => {
    const riskDown = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 60 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 20 })]);
    expect(riskDown.find((t) => t.metric === "risk")!.direction).toBe("improving");
    const riskUp = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 20 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 60 })]);
    expect(riskUp.find((t) => t.metric === "risk")!.direction).toBe("declining");
  });

  it("fingerprint changed once — categorical trend reads 'unknown', never 'improving'/'declining'", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "Balanced" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", fingerprint: "Concentrated" })]);
    const fp = trends.find((t) => t.metric === "fingerprint")!;
    expect(fp.direction).toBe("unknown");
    expect(fp.delta).toBeNull();
    expect(fp.from).toBe("Balanced");
    expect(fp.to).toBe("Concentrated");
  });

  it("fingerprint unchanged across every snapshot — categorical trend reads 'stable'", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "Balanced" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", fingerprint: "Balanced" }), snapshot({ timestamp: "2026-01-03T00:00:00.000Z", fingerprint: "Balanced" })]);
    expect(trends.find((t) => t.metric === "fingerprint")!.direction).toBe("stable");
  });

  it("recommendation changes are classified the same categorical way as fingerprint", () => {
    const trends = buildTrends([snapshot({ timestamp: "2026-01-01T00:00:00.000Z", primaryRecommendationId: "reduce-concentration" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", primaryRecommendationId: "increase-diversification" })]);
    expect(trends.find((t) => t.metric === "recommendation")!.direction).toBe("unknown");
  });

  it("large history (200 snapshots) computes without error, using only first/last", () => {
    const history = Array.from({ length: 200 }, (_, i) => snapshot({ timestamp: `2026-01-01T00:${String(i).padStart(2, "0")}:00.000Z`, healthScore: 40 + i }));
    const start = performance.now();
    const trends = buildTrends(history);
    expect(performance.now() - start).toBeLessThan(50); // O(n) or better, not accidentally quadratic
    expect(trends.find((t) => t.metric === "health")!.from).toBe(40);
    expect(trends.find((t) => t.metric === "health")!.to).toBe(239);
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 82 })];
    expect(buildTrends(history)).toEqual(buildTrends(history));
  });
});

describe("confidence.ts — numericTrendConfidence / categoricalTrendConfidence", () => {
  it("numericTrendConfidence: fewer than 2 values is honestly 'unknown', with null span/consistency", () => {
    const detail = numericTrendConfidence([50], ["2026-01-01T00:00:00.000Z"], () => true);
    expect(detail.confidence).toBe("unknown");
    expect(detail.snapshotCount).toBe(1);
    expect(detail.timeSpanDays).toBeNull();
    expect(detail.consistencyScore).toBeNull();
  });

  it("numericTrendConfidence: 2 snapshots, 1 day apart, one consistent step — 'medium' (not enough snapshots for 'high')", () => {
    const detail = numericTrendConfidence([10, 90], ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z"], () => true);
    expect(detail.confidence).toBe("medium");
    expect(detail.snapshotCount).toBe(2);
    expect(detail.timeSpanDays).toBe(1);
    expect(detail.consistencyScore).toBe(1);
    expect(detail.confidenceReason).toMatch(/medium/i);
  });

  it("numericTrendConfidence: many snapshots, long span, every step consistent — 'high'", () => {
    const values = [40, 48, 56, 64, 72, 80];
    const timestamps = Array.from({ length: 6 }, (_, i) => `2026-01-${String(i * 2 + 1).padStart(2, "0")}T00:00:00.000Z`); // 10-day span
    const detail = numericTrendConfidence(values, timestamps, (stepDelta) => Math.abs(stepDelta) >= 3);
    expect(detail.confidence).toBe("high");
    expect(detail.timeSpanDays).toBe(10);
    expect(detail.consistencyScore).toBe(1);
  });

  it("numericTrendConfidence: 2 snapshots on the same day — 'low' (no count or span credit)", () => {
    const detail = numericTrendConfidence([10, 90], ["2026-01-01T00:00:00.000Z", "2026-01-01T06:00:00.000Z"], () => true);
    expect(detail.confidence).toBe("low");
  });

  it("numericTrendConfidence: a zig-zagging series degrades confidence even with lots of history, and reports a real fractional consistencyScore", () => {
    const values = [50, 80, 40, 90];
    const timestamps = ["2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z", "2026-01-03T00:00:00.000Z", "2026-01-04T00:00:00.000Z"];
    const detail = numericTrendConfidence(values, timestamps, (stepDelta) => Math.abs(stepDelta) >= 3);
    expect(detail.confidence).toBe("medium");
    expect(detail.consistencyScore).toBeCloseTo(0.667, 2);
  });

  it("numericTrendConfidence: a consistently DECREASING series is still 'high' confidence — sign is derived from the raw values, never from an inverted metric's 'improving'/'declining' label", () => {
    const values = [80, 72, 64, 56, 48, 40]; // e.g. a risk score consistently dropping
    const timestamps = Array.from({ length: 6 }, (_, i) => `2026-01-${String(i * 2 + 1).padStart(2, "0")}T00:00:00.000Z`); // 10-day span
    const detail = numericTrendConfidence(values, timestamps, (stepDelta) => Math.abs(stepDelta) >= 3);
    expect(detail.confidence).toBe("high");
  });

  it("categoricalTrendConfidence: fewer than 2 snapshots is 'unknown'", () => {
    const detail = categoricalTrendConfidence(1, "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "stable");
    expect(detail.confidence).toBe("unknown");
    expect(detail.consistencyScore).toBeNull();
  });

  it("categoricalTrendConfidence: a real category change is always 'unknown' — no settled trend to rate, consistencyScore honestly null (never a fabricated 0)", () => {
    const detail = categoricalTrendConfidence(10, "2026-01-01T00:00:00.000Z", "2026-01-20T00:00:00.000Z", "unknown");
    expect(detail.confidence).toBe("unknown");
    expect(detail.consistencyScore).toBeNull();
    expect(detail.timeSpanDays).toBe(19); // the real span still gets reported even though confidence itself is unknown
  });

  it("categoricalTrendConfidence: unchanged across many snapshots over a long span — 'high', consistencyScore is 1 (maximally consistent by definition)", () => {
    const detail = categoricalTrendConfidence(6, "2026-01-01T00:00:00.000Z", "2026-01-10T00:00:00.000Z", "stable");
    expect(detail.confidence).toBe("high");
    expect(detail.consistencyScore).toBe(1);
  });

  it("categoricalTrendConfidence: unchanged, but only 2 snapshots on the same day — 'low'", () => {
    expect(categoricalTrendConfidence(2, "2026-01-01T00:00:00.000Z", "2026-01-01T01:00:00.000Z", "stable").confidence).toBe("low");
  });
});

describe("biggestChange.ts — buildBiggestChange", () => {
  it("nothing moved — every trend stable/unknown — returns null, never a guess", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z" })];
    expect(buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history)).toBeNull();
  });

  it("empty history — no trends moved — returns null", () => {
    expect(buildBiggestChange(buildTrends([]), buildAllocationAnalytics([]), [])).toBeNull();
  });

  it("picks the trend with the largest real magnitude, citing its own reason verbatim as the primary cause", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, riskScore: 50 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, riskScore: 45 }),
    ];
    const trends = buildTrends(history);
    const biggest = buildBiggestChange(trends, buildAllocationAnalytics(history), history);
    expect(biggest?.metric).toBe("health");
    expect(biggest?.category).toBe("Health");
    expect(biggest?.magnitude).toBe(40);
    expect(biggest?.primaryCause).toBe(trends.find((t) => t.metric === "health")!.reason);
    expect(biggest?.timePeriod).toEqual({ from: "2026-01-01T00:00:00.000Z", to: "2026-01-02T00:00:00.000Z" });
  });

  it("ranks Portfolio Value by normalized ratio, not raw dollar delta — a modest score move can outrank a large dollar move", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, totalValue: 1_000_000 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, totalValue: 1_060_000 }), // +6% ratio, but a $60k raw delta
    ];
    const biggest = buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history);
    expect(biggest?.metric).toBe("health"); // |delta|=40 outranks value's normalized 6
  });

  it("affectedScores reports real, independently-derived movement for health/confidence/risk/recommendation", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, confidenceScore: 80, riskScore: 50, primaryRecommendationId: "a" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, confidenceScore: 80, riskScore: 20, primaryRecommendationId: "b" }),
    ];
    const biggest = buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history);
    expect(biggest?.affectedScores).toEqual({ health: true, confidence: false, risk: true, recommendation: true });
  });

  it("excludes categorical trends (recommendation/fingerprint) from ranking — they have no comparable magnitude", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 70, primaryRecommendationId: "a", fingerprint: "Balanced" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 71, primaryRecommendationId: "b", fingerprint: "Concentrated" }), // health below threshold — stable
    ];
    expect(buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history)).toBeNull();
  });

  it("V4-ANALYTICS-001A: ETH Allocation is a real, rankable candidate — a pure allocation-mix shift can win even when no score trend moved", () => {
    const eth60 = { symbol: "ETH", name: "ETH", address: null, usdValue: 6000, allocationPct: 60 };
    const eth85 = { symbol: "ETH", name: "ETH", address: null, usdValue: 8500, allocationPct: 85 };
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 65, ethPct: 64, topHoldings: [eth60] }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 66, ethPct: 82, topHoldings: [eth85] }), // health barely moved (stable), ETH allocation moved a lot
    ];
    const biggest = buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history);
    expect(biggest?.metric).toBe("ethAllocation");
    expect(biggest?.category).toBe("ETH Allocation");
    expect(biggest?.magnitude).toBe(18);
    expect(biggest?.primaryCause).not.toMatch(/purchase|bought|sold/i); // never fabricates a transaction-level cause
  });

  it("V4-ANALYTICS-001A: supportingMetrics lists every OTHER real trend that also moved, never the winner itself", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, riskScore: 50, diversificationScore: 40 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, riskScore: 20, diversificationScore: 70 }),
    ];
    const biggest = buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history);
    expect(biggest?.metric).toBe("health");
    const supportingMetrics = biggest?.supportingMetrics.map((m) => m.metric) ?? [];
    expect(supportingMetrics).not.toContain("health");
    expect(supportingMetrics).toContain("risk");
    expect(supportingMetrics).toContain("diversification");
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const trends = buildTrends(history);
    const allocation = buildAllocationAnalytics(history);
    expect(buildBiggestChange(trends, allocation, history)).toEqual(buildBiggestChange(trends, allocation, history));
  });
});

describe("comparison.ts — buildPortfolioEvolution", () => {
  it("empty history — every finding is honestly null, no crash", () => {
    expect(Object.values(buildPortfolioEvolution([])).every((v) => v === null)).toBe(true);
  });

  it("single-snapshot history — every comparison-based finding is null (nothing to compare), except mostStableAsset, which is trivially and honestly true for one real data point", () => {
    const evolution = buildPortfolioEvolution([snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })]);
    expect(evolution.largestImprovement).toBeNull();
    expect(evolution.largestDeterioration).toBeNull();
    expect(evolution.biggestAllocationShift).toBeNull();
    expect(evolution.mostVolatileAllocation).toBeNull();
    expect(evolution.longestUnchangedRecommendation).toBeNull();
    expect(evolution.mostRepeatedWarning).toBeNull();
    expect(evolution.mostStableAsset?.value).toBe("ETH");
  });

  it("mostVolatileAllocation is always null — this snapshot model has no per-asset time series to honestly rank volatility from", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    expect(buildPortfolioEvolution(history).mostVolatileAllocation).toBeNull();
  });

  it("largestImprovement picks the single biggest positive score move, citing the real delta", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 60, confidenceScore: 80, diversificationScore: 70 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 65, confidenceScore: 95, diversificationScore: 72 }),
    ];
    const evolution = buildPortfolioEvolution(history);
    expect(evolution.largestImprovement?.metric).toBe("confidence");
  });

  it("mostStableAsset reports the symbol only when it's honestly unchanged across every snapshot", () => {
    const stable = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", largestHoldingSymbol: "ETH" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", largestHoldingSymbol: "ETH" })];
    expect(buildPortfolioEvolution(stable).mostStableAsset?.value).toBe("ETH");

    const changed = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", largestHoldingSymbol: "ETH" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", largestHoldingSymbol: "USDC" })];
    expect(buildPortfolioEvolution(changed).mostStableAsset).toBeNull();
  });

  it("longestUnchangedRecommendation finds the real longest consecutive run", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", primaryRecommendationId: "a" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", primaryRecommendationId: "b" }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", primaryRecommendationId: "b" }),
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", primaryRecommendationId: "b" }),
      snapshot({ timestamp: "2026-01-05T00:00:00.000Z", primaryRecommendationId: "a" }),
    ];
    const evolution = buildPortfolioEvolution(history);
    expect(evolution.longestUnchangedRecommendation?.value).toBe(3);
  });

  it("mostRepeatedWarning tallies real frequency, never fires on a single occurrence", () => {
    const single = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", topWarningId: "concentration-high" })];
    expect(buildPortfolioEvolution(single).mostRepeatedWarning).toBeNull();

    const repeated = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", topWarningId: "concentration-high" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", topWarningId: "concentration-high" }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", topWarningId: "no-stablecoins" }),
    ];
    const evolution = buildPortfolioEvolution(repeated);
    expect(evolution.mostRepeatedWarning?.detail).toContain("concentration-high");
    expect(evolution.mostRepeatedWarning?.value).toBe(2);
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    expect(buildPortfolioEvolution(history)).toEqual(buildPortfolioEvolution(history));
  });
});

describe("allocation.ts — buildAllocationAnalytics", () => {
  const eth = { symbol: "ETH", name: "ETH", address: null, usdValue: 5000, allocationPct: 50 };
  const usdc = { symbol: "USDC", name: "USDC", address: "0xusdc", usdValue: 2000, allocationPct: 20 };
  const aero = { symbol: "AERO", name: "Aerodrome Finance", address: "0xaero", usdValue: 1000, allocationPct: 10 };

  it("empty history produces honestly empty analytics, no crash", () => {
    const analytics = buildAllocationAnalytics([]);
    expect(analytics.topChanges).toEqual([]);
    expect(analytics.newAssets).toEqual([]);
  });

  it("detects genuinely new and removed assets between first and last snapshot", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", topHoldings: [eth, usdc] }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", topHoldings: [eth, aero] }),
    ];
    const analytics = buildAllocationAnalytics(history);
    expect(analytics.newAssets).toEqual(["AERO"]);
    expect(analytics.removedAssets).toEqual(["USDC"]);
  });

  it("classifies growing vs shrinking positions by real allocationPct delta", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", topHoldings: [{ ...eth, allocationPct: 40 }] }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", topHoldings: [{ ...eth, allocationPct: 82 }] }),
    ];
    const analytics = buildAllocationAnalytics(history);
    expect(analytics.growingPositions).toHaveLength(1);
    expect(analytics.growingPositions[0].deltaPct).toBe(42);
    expect(analytics.shrinkingPositions).toHaveLength(0);
  });

  it("protocolExposureChange and nativeVsStablecoinChange read real fields, never recomputed", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", largestProtocolName: "Aerodrome Finance", ethPct: 40, stablecoinExposure: 30 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", largestProtocolName: "Compound", ethPct: 60, stablecoinExposure: 10 }),
    ];
    const analytics = buildAllocationAnalytics(history);
    expect(analytics.protocolExposureChange).toEqual({ from: "Aerodrome Finance", to: "Compound", changed: true });
    expect(analytics.nativeVsStablecoinChange).toEqual({ ethPctFrom: 40, ethPctTo: 60, stablecoinPctFrom: 30, stablecoinPctTo: 10 });
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", topHoldings: [eth] }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", topHoldings: [eth, usdc] })];
    expect(buildAllocationAnalytics(history)).toEqual(buildAllocationAnalytics(history));
  });
});

describe("timeline.ts — buildAnalyticsTimeline", () => {
  it("reshapes real WalletEvents, never fabricates one — same count in as out", () => {
    const events = [walletEvent({ id: "e1", timestamp: "2026-01-01T09:00:00.000Z", title: "Health improved" }), walletEvent({ id: "e2", timestamp: "2026-01-02T09:00:00.000Z", title: "Confidence increased" })];
    const timeline = buildAnalyticsTimeline(events);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].headline).toBe("Health improved");
    expect(timeline[0].date).toBe("2026-01-01");
  });

  it("empty event log produces an honestly empty timeline — no duplicate/invented events", () => {
    expect(buildAnalyticsTimeline([])).toEqual([]);
  });

  it("sorts chronologically (oldest first) regardless of input order", () => {
    const events = [walletEvent({ id: "e2", timestamp: "2026-01-02T00:00:00.000Z" }), walletEvent({ id: "e1", timestamp: "2026-01-01T00:00:00.000Z" })];
    const timeline = buildAnalyticsTimeline(events);
    expect(timeline.map((e) => e.id)).toEqual(["e1", "e2"]);
  });
});

describe("summary.ts — buildAnalyticsExecutiveSummary", () => {
  it("honestly states insufficient history rather than fabricating a summary", () => {
    const summary = buildAnalyticsExecutiveSummary(buildTrends([]), buildPortfolioEvolution([]), 0);
    expect(summary).toMatch(/not enough history/i);
  });

  it("composes a real improving-portfolio summary from real trends/evolution", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 60, riskScore: 60, confidenceScore: 90, diversificationScore: 50 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 82, riskScore: 20, confidenceScore: 90, diversificationScore: 75 }),
    ];
    const trends = buildTrends(history);
    const evolution = buildPortfolioEvolution(history);
    const summary = buildAnalyticsExecutiveSummary(trends, evolution, history.length);
    expect(summary).toMatch(/improved/i);
    expect(summary).toContain("Confidence remained high.");
  });
});

describe("engine.ts — buildWalletAnalytics", () => {
  it("composes every piece from the same shared history/events, no duplicate computation", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const events = [walletEvent({ id: "e1", timestamp: "2026-01-02T00:00:00.000Z", title: "Health improved" })];
    const analytics = buildWalletAnalytics(history, events);
    expect(analytics.snapshotCount).toBe(2);
    expect(analytics.trends).toEqual(buildTrends(history));
    expect(analytics.evolution).toEqual(buildPortfolioEvolution(history));
    expect(analytics.biggestChange).toEqual(buildBiggestChange(buildTrends(history), buildAllocationAnalytics(history), history));
    expect(analytics.timeline).toEqual(buildAnalyticsTimeline(events));
  });

  it("defaults to an empty event log — never fabricates history", () => {
    const analytics = buildWalletAnalytics([snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })]);
    expect(analytics.timeline).toEqual([]);
  });

  it("is fully deterministic given the same explicit 'now'", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const now = "2026-01-03T00:00:00.000Z";
    expect(buildWalletAnalytics(history, [], "all", now)).toEqual(buildWalletAnalytics(history, [], "all", now));
  });

  it("large history (500 snapshots) computes well within a reasonable time budget", () => {
    const history = Array.from({ length: 500 }, (_, i) => snapshot({ timestamp: `2026-01-01T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`, healthScore: 40 + (i % 60) }));
    const start = performance.now();
    buildWalletAnalytics(history);
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("index.ts — public API barrel", () => {
  it("exposes buildWalletAnalytics and every sub-builder", () => {
    expect(typeof WalletAnalyticsPublicApi.buildWalletAnalytics).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildTrends).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildPortfolioEvolution).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildAllocationAnalytics).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildAnalyticsTimeline).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildAnalyticsExecutiveSummary).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.appendSnapshot).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildBiggestChange).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.numericTrendConfidence).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.categoricalTrendConfidence).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildPortfolioMilestones).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildPersonalBests).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildRecoveryAnalysis).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildTrendCorrelation).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildChangeFrequency).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildStabilityIndex).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.buildAnalyticsExportSnapshot).toBe("function");
    expect(typeof WalletAnalyticsPublicApi.filterHistoryByWindow).toBe("function");
  });

  it("buildWalletAnalytics from the barrel matches the direct import's output, given the same explicit 'now'", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })];
    const now = "2026-01-02T00:00:00.000Z";
    expect(WalletAnalyticsPublicApi.buildWalletAnalytics(history, [], "all", now)).toEqual(buildWalletAnalytics(history, [], "all", now));
  });
});
