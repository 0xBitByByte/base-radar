import { describe, expect, it } from "vitest";

import { buildShareDescription, buildSharePreview, buildShareSummary, buildShareTitle } from "@/lib/report-share/engine";
import { DEFAULT_SHARE_OPTIONS } from "@/lib/report-share/types";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics, PersonalBests, PortfolioMilestones } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { ShareSourceData } from "@/lib/report-share/types";

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
    period: "30d",
    overview: { period: "30d", periodLabel: "Last 30 Days", snapshotCount: 3, firstSnapshotDate: "2026-08-01T00:00:00.000Z", lastSnapshotDate: "2026-09-01T00:00:00.000Z", startValue: 8000, endValue: 12000, netValueChange: 4000 },
    health: { ...EMPTY_METRIC_SUMMARY },
    confidence: { ...EMPTY_METRIC_SUMMARY, metric: "confidenceScore", label: "Confidence" },
    risk: { ...EMPTY_METRIC_SUMMARY, metric: "riskScore", label: "Risk" },
    value: { ...EMPTY_METRIC_SUMMARY, metric: "totalValue", label: "Portfolio Value" },
    fingerprintChanges: [],
    majorRecoveries: [],
    personalBests: EMPTY_PERSONAL_BESTS,
    milestones: EMPTY_MILESTONES,
    highlights: [],
    statistics: { highestValue: null, lowestRisk: null, highestConfidence: null, bestHealth: null, largestImprovement: null, largestDecline: null, recoveryCount: 0, milestoneCount: 0, snapshotCount: 3 },
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

function makeCrossFeature(overrides: Partial<CrossFeatureIntelligence> = {}): CrossFeatureIntelligence {
  const events = overrides.events ?? [];
  const recommendations = overrides.recommendations ?? [];
  return { events, recommendations, timeline: overrides.timeline ?? [], latestStory: overrides.latestStory ?? null, indexes: buildCrossFeatureIndexes(events, recommendations) };
}

function makeData(overrides: Partial<ShareSourceData> = {}): ShareSourceData {
  return {
    report: makeReport(),
    ai: null,
    intelligence: null,
    analytics: makeAnalytics(),
    history: { snapshotCount: 3, oldestSnapshot: null, newestSnapshot: null },
    crossFeature: makeCrossFeature(),
    digest: null,
    story: null,
    ...overrides,
  };
}

describe("buildShareTitle / buildShareSummary / buildShareDescription — real facts only", () => {
  it("title reuses the real period label", () => {
    expect(buildShareTitle(makeData())).toBe("Base Radar — Portfolio Report (Last 30 Days)");
  });

  it("summary is a real deterministic fact string off report.overview", () => {
    expect(buildShareSummary(makeData())).toBe("3 snapshots, +$4,000 net change");
  });

  it("description reuses ai.overview.explanation verbatim when present", () => {
    expect(buildShareDescription(makeData({ ai: makeAI({ overview: { priority: "recommendation", headline: "h", explanation: "Real advisor read.", confidence: "High", nextAction: null, actionReason: null } }) }))).toBe("Real advisor read.");
  });

  it("description falls back to an honest fact string when ai is null — never fabricated", () => {
    expect(buildShareDescription(makeData())).toBe("Last 30 Days portfolio report generated by Base Radar.");
  });
});

describe("buildSharePreview — base report is ALWAYS included, reused verbatim from buildReportExportSections", () => {
  it("the base markdown includes real report facts even with every toggle off", () => {
    const bundle = buildSharePreview(makeData(), DEFAULT_SHARE_OPTIONS, "2026-09-06T00:00:00.000Z");
    expect(bundle.markdown).toContain("Last 30 Days");
    expect(bundle.markdown).toContain("Snapshots");
  });

  it("every format (markdown/text/html) is produced through the shared renderers — same content, different shape", () => {
    const bundle = buildSharePreview(makeData(), DEFAULT_SHARE_OPTIONS, "2026-09-06T00:00:00.000Z");
    expect(bundle.markdown).toContain("#");
    expect(bundle.html).toContain("<h1>");
    expect(bundle.text).not.toContain("<h1>");
  });
});

describe("buildSharePreview — opt-in inclusion, never opt-out", () => {
  it("history section appears only when options.history is true, using the real snapshot count", () => {
    const data = makeData({ history: { snapshotCount: 42, oldestSnapshot: null, newestSnapshot: null } });
    const off = buildSharePreview(data, DEFAULT_SHARE_OPTIONS);
    expect(off.markdown).not.toContain("Snapshot History");

    const on = buildSharePreview(data, { ...DEFAULT_SHARE_OPTIONS, history: true });
    expect(on.markdown).toContain("Snapshot History");
    expect(on.markdown).toContain("42");
  });

  it("timeline section reuses real CrossFeatureIntelligence.timeline entries verbatim", () => {
    const data = makeData({ crossFeature: makeCrossFeature({ timeline: [{ id: "t1", timestamp: "2026-08-15T00:00:00.000Z", headline: "Real correlated moment.", tone: "positive", sources: ["automation"] }] }) });
    const bundle = buildSharePreview(data, { ...DEFAULT_SHARE_OPTIONS, timeline: true });
    expect(bundle.markdown).toContain("Real correlated moment.");
  });

  it("recommendations section reuses real PortfolioIntelligence.recommendations, empty when intelligence is null", () => {
    const withIntelligence = makeData({ intelligence: makeIntelligence({ recommendations: [{ id: "r1", title: "Diversify holdings", explanation: "e", reason: "Top holding is 50%.", priority: "high" }] }) });
    const bundle = buildSharePreview(withIntelligence, { ...DEFAULT_SHARE_OPTIONS, recommendations: true });
    expect(bundle.markdown).toContain("Diversify holdings");

    const withoutIntelligence = buildSharePreview(makeData(), { ...DEFAULT_SHARE_OPTIONS, recommendations: true });
    expect(withoutIntelligence.markdown).not.toContain("Diversify holdings");
  });

  it("digest section is included only when a real digest exists, and reuses buildDigestOnlyExportSections verbatim", () => {
    const withoutDigest = buildSharePreview(makeData(), { ...DEFAULT_SHARE_OPTIONS, digest: true });
    expect(withoutDigest.markdown).not.toContain("Next Month Focus");

    const digest = {
      monthLabel: "September 2026",
      report: makeReport(),
      healthSummary: EMPTY_METRIC_SUMMARY,
      largestImprovement: null,
      largestDecline: null,
      recoveries: [],
      newPersonalBests: [],
      milestones: [],
      importantHighlights: [],
      story: [],
      recommendations: { topPriorities: [], completedImprovements: [], stillOutstanding: [] },
      nextMonthFocus: { action: "Rebalance stablecoins", reason: "Real reason." },
      aiOverview: null,
    };
    const withDigest = buildSharePreview(makeData({ digest }), { ...DEFAULT_SHARE_OPTIONS, digest: true });
    expect(withDigest.markdown).toContain("Rebalance stablecoins");
  });

  it("story section is included only when a real story exists, and reuses buildStoryOnlyExportSections verbatim", () => {
    const withoutStory = buildSharePreview(makeData(), { ...DEFAULT_SHARE_OPTIONS, story: true });
    expect(withoutStory.markdown).not.toContain("Key Turning Points");

    const story = {
      introduction: "Real intro.",
      report: makeReport(),
      whereYouStarted: null,
      keyTurningPoints: [{ timestamp: "2026-08-15T00:00:00.000Z", headline: "Real turning point.", tone: "positive" as const }],
      recoveries: [],
      biggestImprovement: null,
      biggestDecline: null,
      milestones: [],
      currentPosition: null,
      nextRecommendedAction: null,
      aiOverview: null,
      generatedAt: "2026-09-06T00:00:00.000Z",
    };
    const withStory = buildSharePreview(makeData({ story }), { ...DEFAULT_SHARE_OPTIONS, story: true });
    expect(withStory.markdown).toContain("Key Turning Points");
  });
});

describe("buildSharePreview — DETERMINISM", () => {
  it("identical input produces identical bundles", () => {
    const data = makeData();
    const a = buildSharePreview(data, DEFAULT_SHARE_OPTIONS, "2026-09-06T00:00:00.000Z");
    const b = buildSharePreview(data, DEFAULT_SHARE_OPTIONS, "2026-09-06T00:00:00.000Z");
    expect(a).toEqual(b);
  });
});
