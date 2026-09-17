import { describe, expect, it } from "vitest";

import { buildPortfolioStory } from "@/lib/portfolio-story/engine";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence, UnifiedTimelineEntry } from "@/lib/cross-feature/types";

const EMPTY_MILESTONES: PortfolioMilestones = {
  highestPortfolioValue: null,
  highestHealthScore: null,
  highestConfidence: null,
  lowestRisk: null,
  bestDiversification: null,
  largestStablecoinAllocation: null,
  largestEthAllocation: null,
  firstWalletConnection: null,
  mostRecentFingerprint: null,
};

const EMPTY_PERSONAL_BESTS: PersonalBests = { bestHealth: null, bestConfidence: null, lowestRisk: null, largestPortfolioValue: null, bestDiversification: null, longestStablePortfolio: null };
const EMPTY_METRIC_SUMMARY = { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null };

function makeReport(overrides: Partial<HistoricalReport> = {}): HistoricalReport {
  return {
    period: "all",
    overview: { period: "all", periodLabel: "All Time", snapshotCount: 0, firstSnapshotDate: null, lastSnapshotDate: null, startValue: null, endValue: null, netValueChange: null },
    health: { ...EMPTY_METRIC_SUMMARY },
    confidence: { ...EMPTY_METRIC_SUMMARY, metric: "confidenceScore", label: "Confidence" },
    risk: { ...EMPTY_METRIC_SUMMARY, metric: "riskScore", label: "Risk" },
    value: { ...EMPTY_METRIC_SUMMARY, metric: "totalValue", label: "Portfolio Value" },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 0 },
    ...overrides,
  };
}

function makeAnalytics(overrides: Partial<WalletAnalytics> = {}): WalletAnalytics {
  return {
    window: "all",
    snapshotCount: 0,
    trends: [],
    evolution: { largestImprovement: null, largestDeterioration: null, biggestAllocationShift: null, mostStableAsset: null, mostVolatileAllocation: null, longestUnchangedRecommendation: null, mostRepeatedWarning: null },
    biggestChange: null,
    allocation: { topChanges: [], newAssets: [], removedAssets: [], growingPositions: [], shrinkingPositions: [], protocolExposureChange: { from: null, to: null, changed: false }, nativeVsStablecoinChange: { ethPctFrom: 0, ethPctTo: 0, stablecoinPctFrom: 0, stablecoinPctTo: 0 } },
    timeline: [],
    executiveSummary: "",
    correlation: null,
    stability: null,
    milestones: EMPTY_MILESTONES,
    personalBests: EMPTY_PERSONAL_BESTS,
    recoveries: [],
    changeFrequency: null,
    exportSnapshot: { generatedAt: "2026-09-01T00:00:00.000Z", window: "all", rows: [] },
    highlights: [],
    ...overrides,
  };
}

function makeIntelligence(overrides: Partial<PortfolioIntelligence> = {}): PortfolioIntelligence {
  return {
    overallScore: 60,
    riskScore: 30,
    diversificationScore: 70,
    healthScore: 65,
    pricingCoverage: 100,
    unknownAssetCount: 0,
    totalUsdValue: 10000,
    largestHolding: null,
    largestProtocol: null,
    stablecoinExposure: 20,
    defiExposure: 30,
    concentrationRisk: { level: "moderate", topHoldingPct: 50, description: "desc" },
    recommendations: [],
    warnings: [],
    opportunities: [],
    summary: "summary",
    lastUpdated: "2026-09-01T00:00:00.000Z",
    healthBreakdown: [],
    quality: { verifiedAssetCount: 2, unverifiedAssetCount: 1, notCheckedAssetCount: 0, protocolsDetected: 1, diversificationRating: "Fair", diversificationRatingReason: "reason" },
    allocationBreakdown: { topHoldings: [], stablecoinPct: 20, ethPct: 50, otherPct: 30, unknownAssetPct: 0, protocolConcentrationPct: 0, largestProtocolName: null },
    positiveContributors: [],
    negativeContributors: [],
    confidenceScore: 80,
    confidenceLevel: "High",
    fingerprint: "Balanced",
    fingerprintReason: "reason",
    executiveSummary: "A balanced, well-diversified portfolio with moderate risk.",
    ...overrides,
  };
}

function makeAI(overrides: Partial<PortfolioAI> = {}): PortfolioAI {
  return {
    overview: { priority: "recommendation", headline: "h", explanation: "e", confidence: "High", nextAction: null, actionReason: null },
    insights: [],
    actions: [],
    timeline: [],
    summaryLines: [],
    conversationContext: {
      facts: { totalUsdValue: 10000, largestHoldingSymbol: null, largestProtocolName: null, lastUpdated: "2026-09-01T00:00:00.000Z" },
      scores: { overallScore: 60, healthScore: 65, riskScore: 30, diversificationScore: 70, confidenceScore: 80 },
      warnings: [],
      recommendations: [],
      fingerprint: "Balanced",
      confidenceLevel: "High",
      contributors: { positive: [], negative: [] },
      summary: "summary",
    },
    ...overrides,
  };
}

function makeCrossFeature(overrides: Partial<CrossFeatureIntelligence> = {}): CrossFeatureIntelligence {
  const events = overrides.events ?? [];
  const recommendations = overrides.recommendations ?? [];
  return { events, recommendations, timeline: overrides.timeline ?? [], latestStory: overrides.latestStory ?? null, indexes: buildCrossFeatureIndexes(events, recommendations) };
}

function makeTimelineEntry(overrides: Partial<UnifiedTimelineEntry> & { id: string }): UnifiedTimelineEntry {
  return { timestamp: "2026-08-20T00:00:00.000Z", headline: "Health improved.", tone: "positive", sources: ["automation"], ...overrides };
}

describe("buildPortfolioStory — EMPTY HISTORY", () => {
  it("null when there is no real report to build from", () => {
    expect(buildPortfolioStory(null, makeAnalytics(), null, null, makeCrossFeature())).toBeNull();
  });
});

describe("buildPortfolioStory — SINGLE SNAPSHOT", () => {
  it("a real story with an honest zero-turning-point, zero-recovery journey", () => {
    const report = makeReport({ overview: { period: "all", periodLabel: "All Time", snapshotCount: 1, firstSnapshotDate: "2026-09-05T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 10000, endValue: 10000, netValueChange: 0 } });
    const story = buildPortfolioStory(report, makeAnalytics(), makeIntelligence(), makeAI(), makeCrossFeature(), "2026-09-06T00:00:00.000Z");
    expect(story).not.toBeNull();
    expect(story!.recoveries).toEqual([]);
    expect(story!.keyTurningPoints).toEqual([]);
    expect(story!.whereYouStarted).toEqual({ date: "2026-09-05T00:00:00.000Z", value: 10000, health: null });
    expect(story!.currentPosition).toEqual({ date: "2026-09-05T00:00:00.000Z", value: 10000, health: null });
  });
});

describe("buildPortfolioStory — REUSE, never a second calculation", () => {
  it("introduction reuses PortfolioIntelligence.executiveSummary verbatim, never a second summary", () => {
    const report = makeReport();
    const story = buildPortfolioStory(report, makeAnalytics(), makeIntelligence({ executiveSummary: "Real executive summary text." }), makeAI(), makeCrossFeature())!;
    expect(story.introduction).toBe("Real executive summary text.");
  });

  it("empty introduction when intelligence is null — never a fabricated summary", () => {
    const story = buildPortfolioStory(makeReport(), makeAnalytics(), null, makeAI(), makeCrossFeature())!;
    expect(story.introduction).toBe("");
  });

  it("biggestImprovement/biggestDecline are the SAME object references from report.statistics — never recomputed", () => {
    const improvement = { key: "healthScore" as const, label: "Health", oldValue: 40, newValue: 70, delta: 30, changed: true, summary: "+30" };
    const decline = { key: "riskScore" as const, label: "Risk", oldValue: 20, newValue: 60, delta: 40, changed: true, summary: "+40" };
    const report = makeReport({ statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: improvement, largestDecline: decline, recoveryCount: 0, milestoneCount: 0, snapshotCount: 2 } });
    const story = buildPortfolioStory(report, makeAnalytics(), null, null, makeCrossFeature())!;
    expect(story.biggestImprovement).toBe(improvement);
    expect(story.biggestDecline).toBe(decline);
  });

  it("recoveries are the SAME array reference as report.majorRecoveries — never re-derived", () => {
    const recoveries = [{ category: "highRisk" as const, label: "High Risk", recoveryDate: "2026-09-01T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-25T00:00:00.000Z" }, after: { value: 30, timestamp: "2026-09-01T00:00:00.000Z" }, improvement: 50, durationDays: 7 }];
    const report = makeReport({ majorRecoveries: recoveries });
    const story = buildPortfolioStory(report, makeAnalytics(), null, null, makeCrossFeature())!;
    expect(story.recoveries).toBe(recoveries);
  });

  it("milestones is a real FILTER of analytics.highlights — only type 'milestone', never re-ranked", () => {
    const milestone = { type: "milestone" as const, priority: "important" as const, stars: 4, title: "First $10k", reason: "r", supportingMetric: null, topic: "value", dedupeKey: "m1" };
    const nonMilestone = { type: "newPersonalBest" as const, priority: "positive" as const, stars: 3, title: "Best health", reason: "r", supportingMetric: null, topic: "health", dedupeKey: "p1" };
    const story = buildPortfolioStory(makeReport(), makeAnalytics({ highlights: [nonMilestone, milestone] }), null, null, makeCrossFeature())!;
    expect(story.milestones).toEqual([milestone]);
  });

  it("nextRecommendedAction reuses ai.overview.nextAction/actionReason verbatim — never a new recommendation", () => {
    const story = buildPortfolioStory(makeReport(), makeAnalytics(), null, makeAI({ overview: { priority: "recommendation", headline: "h", explanation: "e", confidence: "High", nextAction: "Diversify", actionReason: "Top holding is 50%." } }), makeCrossFeature())!;
    expect(story.nextRecommendedAction).toEqual({ action: "Diversify", reason: "Top holding is 50%." });
  });

  it("null nextRecommendedAction when ai is null or has no next action — never fabricated", () => {
    expect(buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature())!.nextRecommendedAction).toBeNull();
    expect(buildPortfolioStory(makeReport(), makeAnalytics(), null, makeAI(), makeCrossFeature())!.nextRecommendedAction).toBeNull();
  });
});

describe("buildPortfolioStory — KEY TURNING POINTS: chronological, reused verbatim from CrossFeatureIntelligence.timeline", () => {
  it("reverses the newest-first timeline into oldest-first order — a story reads forward", () => {
    const newer = makeTimelineEntry({ id: "t2", timestamp: "2026-09-01T00:00:00.000Z", headline: "Second event." });
    const older = makeTimelineEntry({ id: "t1", timestamp: "2026-08-01T00:00:00.000Z", headline: "First event." });
    const story = buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature({ timeline: [newer, older] }))!;
    expect(story.keyTurningPoints.map((m) => m.headline)).toEqual(["First event.", "Second event."]);
  });

  it("every field is a direct read of the real timeline entry — never fabricated", () => {
    const entry = makeTimelineEntry({ id: "t1", timestamp: "2026-08-01T00:00:00.000Z", headline: "Real headline.", tone: "attention" });
    const story = buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature({ timeline: [entry] }))!;
    expect(story.keyTurningPoints).toEqual([{ timestamp: "2026-08-01T00:00:00.000Z", headline: "Real headline.", tone: "attention" }]);
  });

  it("does not mutate the original CrossFeatureIntelligence.timeline array", () => {
    const timeline = [makeTimelineEntry({ id: "t2", timestamp: "2026-09-01T00:00:00.000Z" }), makeTimelineEntry({ id: "t1", timestamp: "2026-08-01T00:00:00.000Z" })];
    const originalOrder = [...timeline];
    buildPortfolioStory(makeReport(), makeAnalytics(), null, null, makeCrossFeature({ timeline }));
    expect(timeline).toEqual(originalOrder);
  });
});

describe("buildPortfolioStory — DETERMINISM", () => {
  it("identical input produces a deep-equal story", () => {
    const report = makeReport({ overview: { period: "all", periodLabel: "All Time", snapshotCount: 2, firstSnapshotDate: "2026-08-01T00:00:00.000Z", lastSnapshotDate: "2026-09-01T00:00:00.000Z", startValue: 8000, endValue: 12000, netValueChange: 4000 } });
    const a = buildPortfolioStory(report, makeAnalytics(), makeIntelligence(), makeAI(), makeCrossFeature(), "2026-09-06T00:00:00.000Z");
    const b = buildPortfolioStory(report, makeAnalytics(), makeIntelligence(), makeAI(), makeCrossFeature(), "2026-09-06T00:00:00.000Z");
    expect(a).toEqual(b);
  });
});
