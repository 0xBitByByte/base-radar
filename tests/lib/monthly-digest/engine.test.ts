import { describe, expect, it } from "vitest";

import { buildMonthlyDigest } from "@/lib/monthly-digest/engine";
import { buildMonthlyDigestFilename, buildMonthlyDigestHtml, buildMonthlyDigestMarkdown, buildMonthlyDigestText } from "@/lib/monthly-digest/export";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";

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

const EMPTY_PERSONAL_BESTS: PersonalBests = {
  bestHealth: null,
  bestConfidence: null,
  lowestRisk: null,
  largestPortfolioValue: null,
  bestDiversification: null,
  longestStablePortfolio: null,
};

const EMPTY_METRIC_SUMMARY = { metric: "healthScore", label: "Health", highest: null, lowest: null, first: null, last: null, change: null };

function makeReport(overrides: Partial<HistoricalReport> = {}): HistoricalReport {
  return {
    period: "30d",
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 0, firstSnapshotDate: null, lastSnapshotDate: null, startValue: null, endValue: null, netValueChange: null },
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
    executiveSummary: "summary",
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

const EMPTY_CROSS_FEATURE: CrossFeatureIntelligence = { events: [], recommendations: [], timeline: [], latestStory: null, indexes: buildCrossFeatureIndexes([], []) };

describe("monthly-digest — EMPTY HISTORY", () => {
  it("null when there is no real report to build from", () => {
    expect(buildMonthlyDigest(null, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE)).toBeNull();
  });
});

describe("monthly-digest — SINGLE SNAPSHOT", () => {
  it("a real digest with an honest zero-story, zero-recovery period", () => {
    const report = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-05T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 10000, endValue: 10000, netValueChange: 0 } });
    const digest = buildMonthlyDigest(report, makeAnalytics(), makeIntelligence(), makeAI(), EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    expect(digest).not.toBeNull();
    expect(digest!.recoveries).toEqual([]);
    expect(digest!.story).toEqual([]);
    expect(digest!.monthLabel).toBe("September 2026");
  });
});

describe("monthly-digest — MONTH BOUNDARY", () => {
  it("derives the real month label from the report's own real lastSnapshotDate, not 'now'", () => {
    // Mid-month, mid-day — unambiguously August in any real viewer timezone (month labels use LOCAL time, the same established convention `walletHistoryFilters.ts`'s own "Today"/"Yesterday" grouping already uses).
    const report = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-08-15T12:00:00.000Z", lastSnapshotDate: "2026-08-15T12:00:00.000Z", startValue: 10000, endValue: 10000, netValueChange: 0 } });
    const digest = buildMonthlyDigest(report, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    expect(digest!.monthLabel).toBe("August 2026");
  });

  it("a snapshot one real minute later, into September, produces a genuinely different month label", () => {
    const report = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-01T00:01:00.000Z", lastSnapshotDate: "2026-09-01T00:01:00.000Z", startValue: 10000, endValue: 10000, netValueChange: 0 } });
    const digest = buildMonthlyDigest(report, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    expect(digest!.monthLabel).toBe("September 2026");
  });

  it("falls back to the real 'now' month only when the period genuinely has no snapshots", () => {
    const digest = buildMonthlyDigest(makeReport(), makeAnalytics(), null, null, EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    expect(digest!.monthLabel).toBe("September 2026");
  });
});

describe("monthly-digest — MULTIPLE MONTHS", () => {
  it("two real reports, from two different real calendar months, produce two genuinely different digests", () => {
    const augustReport = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-08-15T00:00:00.000Z", lastSnapshotDate: "2026-08-15T00:00:00.000Z", startValue: 9000, endValue: 9000, netValueChange: 0 } });
    const septemberReport = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-15T00:00:00.000Z", lastSnapshotDate: "2026-09-15T00:00:00.000Z", startValue: 12000, endValue: 12000, netValueChange: 0 } });

    const augustDigest = buildMonthlyDigest(augustReport, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE);
    const septemberDigest = buildMonthlyDigest(septemberReport, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE);

    expect(augustDigest!.monthLabel).toBe("August 2026");
    expect(septemberDigest!.monthLabel).toBe("September 2026");
    expect(augustDigest!.report.overview.endValue).toBe(9000);
    expect(septemberDigest!.report.overview.endValue).toBe(12000);
  });
});

describe("monthly-digest — STORY ORDERING (Phase 4)", () => {
  it("filters CrossFeatureIntelligence.timeline to the real report period and orders it chronologically (oldest first)", () => {
    const report = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 3, firstSnapshotDate: "2026-08-01T00:00:00.000Z", lastSnapshotDate: "2026-08-20T00:00:00.000Z", startValue: 8000, endValue: 14000, netValueChange: 6000 } });
    const crossFeature: CrossFeatureIntelligence = {
      events: [],
      recommendations: [],
      timeline: [
        { id: "t3", timestamp: "2026-08-20T00:00:00.000Z", headline: "Latest event", tone: "positive", sources: ["automation"] },
        { id: "outside", timestamp: "2026-07-01T00:00:00.000Z", headline: "Before the period — must be excluded", tone: "neutral", sources: ["history"] },
        { id: "t1", timestamp: "2026-08-05T00:00:00.000Z", headline: "First event", tone: "neutral", sources: ["history"] },
        { id: "t2", timestamp: "2026-08-10T00:00:00.000Z", headline: "Middle event", tone: "attention", sources: ["automation"] },
      ],
      latestStory: null,
      indexes: buildCrossFeatureIndexes([], []),
    };

    const digest = buildMonthlyDigest(report, makeAnalytics(), null, null, crossFeature);
    expect(digest!.story.map((e) => e.headline)).toEqual(["First event", "Middle event", "Latest event"]);
  });
});

describe("monthly-digest — RECOMMENDATION REUSE (Phase 5)", () => {
  it("topPriorities reuses ai.actions verbatim, already ranked — top 3, no second ranking", () => {
    const ai = makeAI({
      actions: [
        { id: "a1", title: "First", description: "d", priority: "high", difficulty: "easy", estimatedImpact: "high", reason: "r" },
        { id: "a2", title: "Second", description: "d", priority: "medium", difficulty: "easy", estimatedImpact: "medium", reason: "r" },
        { id: "a3", title: "Third", description: "d", priority: "low", difficulty: "easy", estimatedImpact: "low", reason: "r" },
        { id: "a4", title: "Fourth", description: "d", priority: "low", difficulty: "easy", estimatedImpact: "low", reason: "r" },
      ],
    });
    const digest = buildMonthlyDigest(makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-01T00:00:00.000Z", lastSnapshotDate: "2026-09-01T00:00:00.000Z", startValue: 1, endValue: 1, netValueChange: 0 } }), makeAnalytics(), null, ai, EMPTY_CROSS_FEATURE);
    expect(digest!.recommendations.topPriorities.map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("completedImprovements reuses report.majorRecoveries verbatim — the SAME real facts as the digest's own Recoveries section", () => {
    const recovery = { category: "highRisk" as const, label: "High Risk", recoveryDate: "2026-09-01T00:00:00.000Z", before: { value: 80, timestamp: "2026-08-25T00:00:00.000Z" }, after: { value: 30, timestamp: "2026-09-01T00:00:00.000Z" }, improvement: 50, durationDays: 7 };
    const report = makeReport({ majorRecoveries: [recovery] });
    const digest = buildMonthlyDigest(report, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE);
    expect(digest!.recommendations.completedImprovements).toBe(digest!.recoveries);
    expect(digest!.recommendations.completedImprovements).toEqual([recovery]);
  });

  it("stillOutstanding reuses intelligence.recommendations verbatim, already priority-sorted", () => {
    const intelligence = makeIntelligence({ recommendations: [{ id: "r1", title: "Diversify", explanation: "e", reason: "r", priority: "high" }] });
    const digest = buildMonthlyDigest(makeReport(), makeAnalytics(), intelligence, null, EMPTY_CROSS_FEATURE);
    expect(digest!.recommendations.stillOutstanding).toEqual(intelligence.recommendations);
  });

  it("no ai/no intelligence -> empty, honest lists, never a crash", () => {
    const digest = buildMonthlyDigest(makeReport(), makeAnalytics(), null, null, EMPTY_CROSS_FEATURE);
    expect(digest!.recommendations.topPriorities).toEqual([]);
    expect(digest!.recommendations.stillOutstanding).toEqual([]);
    expect(digest!.nextMonthFocus).toBeNull();
  });
});

describe("monthly-digest — STATISTICS reuse (Phase 3)", () => {
  it("largestImprovement/largestDecline/healthSummary are the SAME real objects the report already computed — never recomputed", () => {
    const largestImprovement = { key: "healthScore" as const, label: "Health", oldValue: 40, newValue: 70, delta: 30, changed: true, summary: "+30" };
    const report = makeReport({ statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 2 } });
    const digest = buildMonthlyDigest(report, makeAnalytics(), null, null, EMPTY_CROSS_FEATURE);
    expect(digest!.largestImprovement).toBe(largestImprovement);
    expect(digest!.healthSummary).toBe(report.health);
  });

  it("newPersonalBests/milestones are real, filtered Highlights — never a second computation", () => {
    const analytics = makeAnalytics({
      highlights: [
        { type: "newPersonalBest", priority: "positive", stars: 3, title: "New Best Health", reason: "r", supportingMetric: null, topic: "health", dedupeKey: "newPersonalBest:health:1" },
        { type: "milestone", priority: "historical", stars: 1, title: "Milestone reached", reason: "r", supportingMetric: null, topic: "ethAllocation", dedupeKey: "milestone:ethAllocation:1" },
        { type: "stabilityChange", priority: "informational", stars: 2, title: "Stability changed", reason: "r", supportingMetric: null, topic: "stability", dedupeKey: "stabilityChange:stability:1" },
      ],
    });
    const digest = buildMonthlyDigest(makeReport(), analytics, null, null, EMPTY_CROSS_FEATURE);
    expect(digest!.newPersonalBests).toHaveLength(1);
    expect(digest!.newPersonalBests[0].title).toBe("New Best Health");
    expect(digest!.milestones).toHaveLength(1);
    expect(digest!.milestones[0].title).toBe("Milestone reached");
  });
});

describe("monthly-digest — DETERMINISM", () => {
  it("identical inputs produce an identical digest", () => {
    const report = makeReport({ overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 1, firstSnapshotDate: "2026-09-01T00:00:00.000Z", lastSnapshotDate: "2026-09-01T00:00:00.000Z", startValue: 1, endValue: 1, netValueChange: 0 } });
    const analytics = makeAnalytics();
    const a = buildMonthlyDigest(report, analytics, makeIntelligence(), makeAI(), EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    const b = buildMonthlyDigest(report, analytics, makeIntelligence(), makeAI(), EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z");
    expect(a).toEqual(b);
  });
});

describe("monthly-digest — EXPORT (Phase 8, reuses Historical Report Export)", () => {
  const report = makeReport({
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 2, firstSnapshotDate: "2026-08-20T00:00:00.000Z", lastSnapshotDate: "2026-09-05T00:00:00.000Z", startValue: 8000, endValue: 14000, netValueChange: 6000 },
  });
  const digest = buildMonthlyDigest(report, makeAnalytics(), makeIntelligence(), makeAI({ overview: { priority: "recommendation", headline: "h", explanation: "e", confidence: "High", nextAction: "Diversify", actionReason: "Top holding is 50%." } }), EMPTY_CROSS_FEATURE, "2026-09-06T00:00:00.000Z")!;

  it("markdown includes both the real report sections AND the digest's own real extra sections", () => {
    const md = buildMonthlyDigestMarkdown(digest, "2026-09-06T12:00:00.000Z");
    expect(md).toContain("Monthly Portfolio Digest (September 2026)");
    expect(md).toContain("## Overview"); // from buildReportExportSections, reused
    expect(md).toContain("Next Month Focus");
    expect(md).toContain("Diversify");
  });

  it("html and text formats render the same real digest, using the shared renderer (no separate formatting logic)", () => {
    const html = buildMonthlyDigestHtml(digest, "2026-09-06T12:00:00.000Z");
    const text = buildMonthlyDigestText(digest, "2026-09-06T12:00:00.000Z");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Next Month Focus");
    expect(text).toContain("NEXT MONTH FOCUS");
    expect(text).not.toContain("<");
  });

  it("filename is deterministic and reflects the real month label", () => {
    expect(buildMonthlyDigestFilename(digest, "markdown", "2026-09-06T12:00:00.000Z")).toMatch(/^base-radar-monthly-digest-september-2026-.*\.md$/);
  });

  it("DETERMINISM: identical digest and timestamp produce byte-identical exports", () => {
    expect(buildMonthlyDigestMarkdown(digest, "2026-09-06T12:00:00.000Z")).toBe(buildMonthlyDigestMarkdown(digest, "2026-09-06T12:00:00.000Z"));
  });
});
