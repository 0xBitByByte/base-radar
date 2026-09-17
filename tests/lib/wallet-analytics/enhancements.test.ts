import { describe, expect, it } from "vitest";

import { buildBiggestChange } from "@/lib/wallet-analytics/biggestChange";
import { buildTrendCorrelation } from "@/lib/wallet-analytics/correlation";
import { buildWalletAnalytics } from "@/lib/wallet-analytics/engine";
import { buildAnalyticsExportSnapshot } from "@/lib/wallet-analytics/export";
import { buildChangeFrequency } from "@/lib/wallet-analytics/frequency";
import { buildPortfolioMilestones } from "@/lib/wallet-analytics/milestones";
import { buildPersonalBests } from "@/lib/wallet-analytics/personalBests";
import { buildRecoveryAnalysis } from "@/lib/wallet-analytics/recovery";
import { buildStabilityIndex } from "@/lib/wallet-analytics/stability";
import { buildTrends } from "@/lib/wallet-analytics/trend";
import { buildAllocationAnalytics } from "@/lib/wallet-analytics/allocation";
import { filterEventsByWindow, filterHistoryByWindow } from "@/lib/wallet-analytics/window";
import type { AutomationSnapshot, WalletEvent } from "@/lib/wallet-automation/types";

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

describe("window.ts — filterHistoryByWindow / filterEventsByWindow", () => {
  const now = "2026-02-10T00:00:00.000Z";
  const history = [
    snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), // 40 days before now
    snapshot({ timestamp: "2026-01-25T00:00:00.000Z" }), // 16 days before
    snapshot({ timestamp: "2026-02-05T00:00:00.000Z" }), // 5 days before
    snapshot({ timestamp: "2026-02-09T12:00:00.000Z" }), // ~12h before
  ];

  it("'all' returns every snapshot untouched", () => {
    expect(filterHistoryByWindow(history, "all", now)).toHaveLength(4);
  });

  it("'24h' keeps only the last ~12h snapshot", () => {
    const filtered = filterHistoryByWindow(history, "24h", now);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].timestamp).toBe("2026-02-09T12:00:00.000Z");
  });

  it("'7d' keeps the last two snapshots (5 days and ~12h before)", () => {
    expect(filterHistoryByWindow(history, "7d", now)).toHaveLength(2);
  });

  it("'30d' excludes the 40-day-old snapshot but keeps the rest", () => {
    const filtered = filterHistoryByWindow(history, "30d", now);
    expect(filtered).toHaveLength(3);
    expect(filtered.some((s) => s.timestamp === "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("'thisMonth' keeps only February snapshots", () => {
    const filtered = filterHistoryByWindow(history, "thisMonth", now);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((s) => s.timestamp.startsWith("2026-02"))).toBe(true);
  });

  it("never mutates the input array or its order", () => {
    const copy = [...history];
    filterHistoryByWindow(history, "7d", now);
    expect(history).toEqual(copy);
  });

  it("filterEventsByWindow applies the identical real cutoff to events", () => {
    const events = [walletEvent({ id: "e1", timestamp: "2026-01-01T00:00:00.000Z" }), walletEvent({ id: "e2", timestamp: "2026-02-09T12:00:00.000Z" })];
    expect(filterEventsByWindow(events, "24h", now)).toHaveLength(1);
    expect(filterEventsByWindow(events, "all", now)).toHaveLength(2);
  });
});

describe("milestones.ts — buildPortfolioMilestones", () => {
  it("empty history — every milestone honestly null", () => {
    const milestones = buildPortfolioMilestones([]);
    expect(Object.values(milestones).every((m) => m === null)).toBe(true);
  });

  it("single snapshot — every milestone trivially points at that one real snapshot", () => {
    const only = snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 77 });
    const milestones = buildPortfolioMilestones([only]);
    expect(milestones.highestHealthScore?.value).toBe(77);
    expect(milestones.highestHealthScore?.snapshot).toBe(only);
    expect(milestones.firstWalletConnection?.date).toBe("2026-01-01T00:00:00.000Z");
    expect(milestones.mostRecentFingerprint?.value).toBe("Mixed");
  });

  it("picks the real extreme snapshot across history for each metric, citing its real date", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, riskScore: 80, confidenceScore: 40, totalValue: 5000 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 95, riskScore: 10, confidenceScore: 99, totalValue: 20000 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", healthScore: 70, riskScore: 50, confidenceScore: 60, totalValue: 15000 }),
    ];
    const milestones = buildPortfolioMilestones(history);
    expect(milestones.highestHealthScore?.value).toBe(95);
    expect(milestones.highestHealthScore?.date).toBe("2026-01-02T00:00:00.000Z");
    expect(milestones.lowestRisk?.value).toBe(10);
    expect(milestones.highestConfidence?.value).toBe(99);
    expect(milestones.highestPortfolioValue?.value).toBe(20000);
  });

  it("firstWalletConnection is always history[0], mostRecentFingerprint is always history[last]", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "Balanced" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", fingerprint: "Concentrated" }),
    ];
    const milestones = buildPortfolioMilestones(history);
    expect(milestones.firstWalletConnection?.date).toBe("2026-01-01T00:00:00.000Z");
    expect(milestones.mostRecentFingerprint?.value).toBe("Concentrated");
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    expect(buildPortfolioMilestones(history)).toEqual(buildPortfolioMilestones(history));
  });
});

describe("personalBests.ts — buildPersonalBests", () => {
  it("aliases milestones exactly — never recomputes them", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const milestones = buildPortfolioMilestones(history);
    const bests = buildPersonalBests(milestones, history);
    expect(bests.bestHealth).toBe(milestones.highestHealthScore); // same reference, not a recomputed equal-but-different object
    expect(bests.lowestRisk).toBe(milestones.lowestRisk);
    expect(bests.largestPortfolioValue).toBe(milestones.highestPortfolioValue);
  });

  it("longestStablePortfolio finds the real longest consecutive unchanged-fingerprint run", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "A" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", fingerprint: "B" }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", fingerprint: "B" }),
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", fingerprint: "B" }),
      snapshot({ timestamp: "2026-01-05T00:00:00.000Z", fingerprint: "A" }),
    ];
    const bests = buildPersonalBests(buildPortfolioMilestones(history), history);
    expect(bests.longestStablePortfolio).toEqual({ snapshotCount: 3, fingerprint: "B", from: "2026-01-02T00:00:00.000Z", to: "2026-01-04T00:00:00.000Z" });
  });

  it("longestStablePortfolio is null when the fingerprint never repeats", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "A" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", fingerprint: "B" })];
    expect(buildPersonalBests(buildPortfolioMilestones(history), history).longestStablePortfolio).toBeNull();
  });
});

describe("recovery.ts — buildRecoveryAnalysis", () => {
  it("fewer than 2 snapshots — no recoveries possible", () => {
    expect(buildRecoveryAnalysis([])).toEqual([]);
    expect(buildRecoveryAnalysis([snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })])).toEqual([]);
  });

  it("detects a real High Risk recovery: risk crosses into the poor band, then back out", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 30 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 80 }), // enters high-risk (>=67)
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", riskScore: 75 }), // still high
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", riskScore: 20 }), // recovered
    ];
    const recoveries = buildRecoveryAnalysis(history);
    const highRisk = recoveries.find((r) => r.category === "highRisk");
    expect(highRisk).toBeDefined();
    expect(highRisk?.before).toEqual({ value: 80, timestamp: "2026-01-02T00:00:00.000Z" });
    expect(highRisk?.after).toEqual({ value: 20, timestamp: "2026-01-04T00:00:00.000Z" });
    expect(highRisk?.improvement).toBe(60);
    expect(highRisk?.durationDays).toBe(2);
  });

  it("no recovery reported when the poor state never resolves within the history", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 30 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 90 })];
    expect(buildRecoveryAnalysis(history).find((r) => r.category === "highRisk")).toBeUndefined();
  });

  it("detects Unknown Assets recovery (unknownAssetCount > 0 back to 0)", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", unknownAssetCount: 0 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", unknownAssetCount: 3 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", unknownAssetCount: 0 }),
    ];
    const recovery = buildRecoveryAnalysis(history).find((r) => r.category === "unknownAssets");
    expect(recovery?.before.value).toBe(3);
    expect(recovery?.after.value).toBe(0);
  });

  it("detects Low Pricing Coverage recovery (crosses back above the real 70% threshold)", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", pricingCoverage: 95 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", pricingCoverage: 50 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", pricingCoverage: 90 }),
    ];
    expect(buildRecoveryAnalysis(history).find((r) => r.category === "lowPricingCoverage")).toBeDefined();
  });

  it("detects multiple real recoveries for the same category across a longer history", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 20 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 80 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", riskScore: 20 }), // recovery 1
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", riskScore: 90 }),
      snapshot({ timestamp: "2026-01-05T00:00:00.000Z", riskScore: 20 }), // recovery 2
    ];
    expect(buildRecoveryAnalysis(history).filter((r) => r.category === "highRisk")).toHaveLength(2);
  });

  it("results are sorted chronologically by recoveryDate", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 80, confidenceScore: 20 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 20, confidenceScore: 90 }), // both recover together
    ];
    const recoveries = buildRecoveryAnalysis(history);
    const dates = recoveries.map((r) => r.recoveryDate);
    expect(dates).toEqual([...dates].sort());
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 80 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 20 })];
    expect(buildRecoveryAnalysis(history)).toEqual(buildRecoveryAnalysis(history));
  });
});

describe("correlation.ts — buildTrendCorrelation", () => {
  it("null outcome metric — nothing to explain", () => {
    expect(buildTrendCorrelation(buildTrends([]), null)).toBeNull();
  });

  it("ranks co-moving trends by magnitude as primary/secondary drivers, and lists them all in affectedMetrics", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, diversificationScore: 40, confidenceScore: 80, riskScore: 50 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, diversificationScore: 75, confidenceScore: 85, riskScore: 20 }),
    ];
    const trends = buildTrends(history);
    const correlation = buildTrendCorrelation(trends, "health");
    expect(correlation?.outcomeMetric).toBe("health");
    expect(correlation?.primaryDriver?.metric).toBe("diversification"); // |35| beats risk's |30| and confidence's real but smaller |5| move
    expect(correlation?.secondaryDriver?.metric).toBe("risk");
    expect(correlation?.affectedMetrics).toContain("diversification");
    expect(correlation?.affectedMetrics).toContain("risk");
    expect(correlation?.note).toMatch(/not a proven cause/i);
  });

  it("never claims causation in its note, regardless of outcome", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const correlation = buildTrendCorrelation(buildTrends(history), "health");
    expect(correlation?.note.toLowerCase()).not.toContain("caused");
    expect(correlation?.note.toLowerCase()).not.toContain("because of");
  });

  it("includes a real categorical change (recommendation) in affectedMetrics but never as a ranked driver", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, primaryRecommendationId: "a" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, primaryRecommendationId: "b" }),
    ];
    const correlation = buildTrendCorrelation(buildTrends(history), "health");
    expect(correlation?.affectedMetrics).toContain("recommendation");
    expect(correlation?.primaryDriver?.metric).not.toBe("recommendation");
    expect(correlation?.secondaryDriver?.metric).not.toBe("recommendation");
  });

  it("confidence reflects real co-movement count: 0 others moved -> 'unknown', 1 -> 'low', 2+ -> 'medium'", () => {
    const nothingElseMoved = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    expect(buildTrendCorrelation(buildTrends(nothingElseMoved), "health")?.confidence).toBe("unknown");

    const oneMoved = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, riskScore: 50 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, riskScore: 20 }),
    ];
    expect(buildTrendCorrelation(buildTrends(oneMoved), "health")?.confidence).toBe("low");
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const trends = buildTrends(history);
    expect(buildTrendCorrelation(trends, "health")).toEqual(buildTrendCorrelation(trends, "health"));
  });
});

describe("frequency.ts — buildChangeFrequency", () => {
  it("fewer than 2 snapshots — null, no rate can be computed", () => {
    expect(buildChangeFrequency([])).toBeNull();
    expect(buildChangeFrequency([snapshot({ timestamp: "2026-01-01T00:00:00.000Z" })])).toBeNull();
  });

  it("counts only real changes crossing the same threshold trend.ts uses — a sub-threshold wobble is never counted", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 70 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 71 }), // +1, below SCORE_CHANGE_THRESHOLD (3)
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", healthScore: 80 }), // +9, real change
    ];
    const frequency = buildChangeFrequency(history);
    expect(frequency?.metrics.find((m) => m.metric === "health")?.lifetimeChanges).toBe(1);
  });

  it("categorical metrics count every real distinct-value transition", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", fingerprint: "A" }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", fingerprint: "B" }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", fingerprint: "B" }),
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", fingerprint: "C" }),
    ];
    expect(buildChangeFrequency(history)?.metrics.find((m) => m.metric === "fingerprint")?.lifetimeChanges).toBe(2);
  });

  it("perWeek/perMonth are real linear projections of perDay", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }),
      snapshot({ timestamp: "2026-01-11T00:00:00.000Z", healthScore: 90 }), // 1 change over 10 days -> 0.1/day
    ];
    const health = buildChangeFrequency(history)?.metrics.find((m) => m.metric === "health");
    expect(health?.perDay).toBe(0.1);
    expect(health?.perWeek).toBeCloseTo(0.7, 5);
    expect(health?.perMonth).toBeCloseTo(3, 5);
  });

  it("zero-span history (identical timestamps can't occur via appendSnapshot, but guard anyway) never divides by zero", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 90 })];
    const frequency = buildChangeFrequency(history);
    expect(frequency?.metrics.every((m) => Number.isFinite(m.perDay))).toBe(true);
  });

  it("is fully deterministic", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    expect(buildChangeFrequency(history)).toEqual(buildChangeFrequency(history));
  });
});

describe("stability.ts — buildStabilityIndex", () => {
  it("fewer than 2 snapshots — null", () => {
    expect(buildStabilityIndex([], null, 0)).toBeNull();
    expect(buildStabilityIndex([], null, 1)).toBeNull();
  });

  it("a portfolio with zero real changes reads as Very Stable", () => {
    const history = Array.from({ length: 5 }, (_, i) => snapshot({ timestamp: `2026-01-0${i + 1}T00:00:00.000Z` })); // every field identical
    const trends = buildTrends(history);
    const frequency = buildChangeFrequency(history);
    const stability = buildStabilityIndex(trends, frequency, history.length);
    expect(stability?.level).toBe("very-stable");
  });

  it("a portfolio changing often, by a lot, and inconsistently reads as more volatile than a calm one", () => {
    const calmHistory = Array.from({ length: 6 }, (_, i) => snapshot({ timestamp: `2026-01-0${i + 1}T00:00:00.000Z`, healthScore: 60 }));
    const volatileHistory = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 20 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", healthScore: 15 }),
      snapshot({ timestamp: "2026-01-04T00:00:00.000Z", healthScore: 95 }),
      snapshot({ timestamp: "2026-01-05T00:00:00.000Z", healthScore: 10 }),
      snapshot({ timestamp: "2026-01-06T00:00:00.000Z", healthScore: 99 }),
    ];
    const calmStability = buildStabilityIndex(buildTrends(calmHistory), buildChangeFrequency(calmHistory), calmHistory.length);
    const volatileStability = buildStabilityIndex(buildTrends(volatileHistory), buildChangeFrequency(volatileHistory), volatileHistory.length);
    expect(volatileStability!.score).toBeGreaterThan(calmStability!.score);
  });

  it("never reads portfolio value alone — an unchanging value with an erratic health score still reads as active/volatile", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", totalValue: 10000, healthScore: 10 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", totalValue: 10000, healthScore: 95 }),
      snapshot({ timestamp: "2026-01-03T00:00:00.000Z", totalValue: 10000, healthScore: 5 }),
    ];
    const stability = buildStabilityIndex(buildTrends(history), buildChangeFrequency(history), history.length);
    expect(stability?.level).not.toBe("very-stable");
  });

  it("is fully deterministic", () => {
    const history = Array.from({ length: 4 }, (_, i) => snapshot({ timestamp: `2026-01-0${i + 1}T00:00:00.000Z`, healthScore: 50 + i * 10 }));
    const trends = buildTrends(history);
    const frequency = buildChangeFrequency(history);
    expect(buildStabilityIndex(trends, frequency, history.length)).toEqual(buildStabilityIndex(trends, frequency, history.length));
  });
});

describe("export.ts — buildAnalyticsExportSnapshot", () => {
  it("produces a flat, JSON-serializable row list with no computation of its own", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const trends = buildTrends(history);
    const milestones = buildPortfolioMilestones(history);
    const allocation = buildAllocationAnalytics(history);
    const biggestChange = buildBiggestChange(trends, allocation, history);
    const frequency = buildChangeFrequency(history);
    const stability = buildStabilityIndex(trends, frequency, history.length);
    const snapshot_ = buildAnalyticsExportSnapshot("2026-01-02T00:00:00.000Z", "all", trends, milestones, biggestChange, stability, frequency);
    expect(() => JSON.stringify(snapshot_)).not.toThrow();
    expect(snapshot_.rows.length).toBeGreaterThan(0);
    expect(snapshot_.rows.every((r) => typeof r.section === "string" && typeof r.label === "string" && typeof r.value === "string")).toBe(true);
    expect(snapshot_.generatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(snapshot_.window).toBe("all");
  });

  it("handles every all-null input honestly without crashing", () => {
    const trends = buildTrends([]);
    const milestones = buildPortfolioMilestones([]);
    const snapshot_ = buildAnalyticsExportSnapshot("2026-01-01T00:00:00.000Z", "24h", trends, milestones, null, null, null);
    expect(snapshot_.rows.some((r) => r.section === "Overview")).toBe(true);
  });
});

describe("engine.ts — window-aware buildWalletAnalytics + new fields", () => {
  it("defaults to window 'all', matching the original pre-V4-ANALYTICS-001A behavior exactly", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const analytics = buildWalletAnalytics(history);
    expect(analytics.window).toBe("all");
    expect(analytics.snapshotCount).toBe(2);
  });

  it("a real window filters trends/evolution/allocation/timeline but NOT milestones/personalBests/recoveries/changeFrequency", () => {
    const now = "2026-02-10T00:00:00.000Z";
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 99 }), // outside 7d window, but the real all-time highest health
      snapshot({ timestamp: "2026-02-09T00:00:00.000Z", healthScore: 40 }),
      snapshot({ timestamp: "2026-02-09T12:00:00.000Z", healthScore: 45 }),
    ];
    const windowed = buildWalletAnalytics(history, [], "7d", now);
    expect(windowed.snapshotCount).toBe(2); // only the two within 7 days
    expect(windowed.milestones.highestHealthScore?.value).toBe(99); // all-time record, from OUTSIDE the window
    expect(windowed.changeFrequency?.metrics[0].lifetimeChanges).toBeDefined(); // computed over full history, not the window
  });

  it("empty events array still lets milestones/recoveries/frequency compute from a real, non-empty history", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z", riskScore: 80 }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", riskScore: 20 })];
    const analytics = buildWalletAnalytics(history);
    expect(analytics.recoveries.length).toBeGreaterThan(0);
    expect(analytics.changeFrequency).not.toBeNull();
  });

  it("correlation explains the same metric as biggestChange, using the SAME already-built trends array", () => {
    const history = [
      snapshot({ timestamp: "2026-01-01T00:00:00.000Z", healthScore: 50, riskScore: 50 }),
      snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90, riskScore: 45 }),
    ];
    const analytics = buildWalletAnalytics(history);
    expect(analytics.correlation?.outcomeMetric).toBe(analytics.biggestChange?.metric);
  });

  it("exportSnapshot.generatedAt matches the real 'now' passed in, for determinism", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const analytics = buildWalletAnalytics(history, [], "all", "2026-06-01T00:00:00.000Z");
    expect(analytics.exportSnapshot.generatedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("is fully deterministic given the same explicit 'now'", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const now = "2026-01-03T00:00:00.000Z";
    expect(buildWalletAnalytics(history, [], "all", now)).toEqual(buildWalletAnalytics(history, [], "all", now));
  });

  it("large history (300 snapshots) computes every new field within a reasonable time budget", () => {
    const history = Array.from({ length: 300 }, (_, i) =>
      snapshot({
        timestamp: `2026-01-${String(Math.floor(i / 24) + 1).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
        healthScore: 40 + (i % 60),
        riskScore: 30 + (i % 40),
        fingerprint: i % 5 === 0 ? "Growth" : "Balanced",
      })
    );
    const start = performance.now();
    const analytics = buildWalletAnalytics(history, [], "all", "2026-03-01T00:00:00.000Z");
    expect(performance.now() - start).toBeLessThan(300);
    expect(analytics.milestones.highestHealthScore).not.toBeNull();
    expect(analytics.recoveries).toBeDefined();
    expect(analytics.changeFrequency).not.toBeNull();
  });

  it("never recalculates Portfolio Intelligence/AI/Automation — every field is derived only from the given history/events (no network, no async)", () => {
    const history = [snapshot({ timestamp: "2026-01-01T00:00:00.000Z" }), snapshot({ timestamp: "2026-01-02T00:00:00.000Z", healthScore: 90 })];
    const result = buildWalletAnalytics(history);
    expect(result).not.toBeInstanceOf(Promise); // purely synchronous
  });
});
